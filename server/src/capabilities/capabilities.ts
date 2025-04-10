// Core
import {
	Diagnostic,
	Range,
	SemanticTokenModifiers,
	SemanticTokenTypes,
	SymbolInformation,
	SymbolKind
} from 'vscode-languageserver';

// Antlr
import { ParserRuleContext, TerminalNode } from 'antlr4ng';

// Project
import { SemanticToken } from '../capabilities/semanticTokens';
import { FoldingRange, FoldingRangeKind } from '../capabilities/folding';
import { BaseContextSyntaxElement, BaseIdentifyableSyntaxElement, Context, HasSemanticTokenCapability } from '../project/elements/base';
import { BaseDiagnostic, DuplicateDeclarationDiagnostic, ShadowDeclarationDiagnostic, SubOrFunctionNotDefinedDiagnostic, VariableNotDefinedDiagnostic } from './diagnostics';
import { Services } from '../injection/services';


abstract class BaseCapability {
	element: BaseContextSyntaxElement<ParserRuleContext>;

	constructor(element: BaseContextSyntaxElement<ParserRuleContext>) {
		this.element = element;
	}
}


export class FoldingRangeCapability extends BaseCapability {
	foldingRangeKind?: FoldingRangeKind;
	openWord?: string;
	closeWord?: string;

	get foldingRange(): FoldingRange {
		const trailingLineCount = this.element.context.rule.countTrailingLineEndings();
		const start = this.element.context.range.start;
		const end = {
			line: this.element.context.range.end.line - trailingLineCount,
			character: this.element.context.range.end.character
		};
		const range = Range.create(start, end);
		return new FoldingRange(range, this.foldingRangeKind, this.openWord, this.closeWord);
	}

	constructor(element: BaseContextSyntaxElement<ParserRuleContext>, foldingRangeKind?: FoldingRangeKind) {
		super(element);
		this.foldingRangeKind = foldingRangeKind;
	}
}


export class DiagnosticCapability extends BaseCapability {
	diagnostics: Diagnostic[] = [];
	evaluate: (...args: any[]) => Diagnostic[];

	constructor(element: BaseContextSyntaxElement<ParserRuleContext>, evaluate?: (...args: any[]) => Diagnostic[]) {
		super(element);
		this.evaluate = evaluate ?? (() => this.diagnostics);
	}
}


export class SemanticTokenCapability extends BaseCapability {
	private tokenType: SemanticTokenTypes;
	private tokenModifiers: SemanticTokenModifiers[];
	private overrideRange?: Range;
	private overrideLength?: number;

	get semanticToken(): SemanticToken {
		const element = this.element as BaseContextSyntaxElement<ParserRuleContext> & HasSemanticTokenCapability;
		const context = element.identifierCapability
			? new Context(element.identifierCapability.nameContext, element.context.document)
			: element.context;

		const range = this.overrideRange ?? context.range;
		const startLine = range.start.line;
		const startChar = range.start.character;
		const textLength = this.overrideLength ?? context.text.length;

		return new SemanticToken(
			element,
			startLine,
			startChar,
			textLength,
			this.tokenType,
			this.tokenModifiers
		);
	}

	constructor(element: BaseContextSyntaxElement<ParserRuleContext> & HasSemanticTokenCapability, tokenType: SemanticTokenTypes, tokenModifiers: SemanticTokenModifiers[], overrideRange?: Range, overrideLength?: number) {
		super(element);
		this.tokenType = tokenType;
		this.tokenModifiers = tokenModifiers;
		this.overrideRange = overrideRange;
		this.overrideLength = overrideLength;
	}
}


export class SymbolInformationCapability extends BaseCapability {
	private symbolKind: SymbolKind;

	get SymbolInformation(): SymbolInformation {
		const element = this.element as BaseIdentifyableSyntaxElement<ParserRuleContext>;
		return SymbolInformation.create(
			element.identifierCapability.name,
			this.symbolKind,
			element.context.range,
			element.context.document.uri
		);
	}

	constructor(element: BaseIdentifyableSyntaxElement<ParserRuleContext>, symbolKind: SymbolKind) {
		super(element);
		this.symbolKind = symbolKind;
	}
}

interface IdentifierArgs {
	element: BaseContextSyntaxElement<ParserRuleContext>,
	getNameContext?: () => ParserRuleContext | TerminalNode | null | undefined,
	formatName?: (name: string) => string,
	defaultName?: string;
	defaultRange?: () => Range;
}


export class IdentifierCapability extends BaseCapability {
	nameContext: ParserRuleContext | TerminalNode;
	range: Range;
	name: string;
	isDefaultMode: boolean;

	constructor(args: IdentifierArgs) {
		super(args.element);

		this.nameContext = ((args.getNameContext ?? (() => args.element.context.rule))() ?? args.element.context.rule);
		this.isDefaultMode = !(!!args.getNameContext && !!args.getNameContext());

		if (!this.isDefaultMode) {
			// Use the context to set the values.
			this.name = (args.formatName ?? ((name: string) => name))(this.nameContext.getText());
			this.range = this.nameContext.toRange(args.element.context.document);
		} else {
			// Use the defaults to set the values.
			if (!args.defaultRange) throw new Error("Default range not optional where name context not found.");
			this.name = (args.defaultName ?? "Unknown Element");
			this.range = args.defaultRange ? args.defaultRange() : args.element.context.range;
		}
	}
}


export enum ItemType {
	/** Base language. */
	VBA,
	/** Application model. */
	APPLICATION,
	/** The user's project. */
	PROJECT,
	/** Class/Module/Form. */
	MODULE,
	/** Function declaration. */
	FUNCTION,
	/** Property declaration. */
	PROPERTY,
	/** Subroutine declaration. */
	SUBROUTINE,
	/** Enum or Type declaration */
	TYPE,
	/** Variable declaration. */
	VARIABLE,
	/** Any reference type that isn't a declaration. */
	REFERENCE
}

export enum AssignmentType {
	NONE = 0,
	GET = 1 << 0,
	LET = 1 << 1,
	SET = 1 << 2,
	CALL = 1 << 3
}

export class ScopeItemCapability {
	// Scope references
	types?: Map<string, ScopeItemCapability[]>;
	modules?: Map<string, ScopeItemCapability[]>;
	functions?: Map<string, ScopeItemCapability[]>;
	subroutines?: Map<string, ScopeItemCapability[]>;
	properties?: {
		getters?: Map<string, ScopeItemCapability[]>,
		setters?: Map<string, ScopeItemCapability[]>,
		letters?: Map<string, ScopeItemCapability[]>
	};
	references?: Map<string, ScopeItemCapability[]>;

	// Links
	link?: ScopeItemCapability;
	backLinks?: ScopeItemCapability[];

	// Technical
	isDirty: boolean = true;

	// Item Properties
	explicitSetName?: string;
	isPublicScope: boolean = false;


	constructor(
		readonly element?: BaseContextSyntaxElement<ParserRuleContext>,
		readonly type: ItemType = ItemType.REFERENCE,
		readonly assignmentType: AssignmentType = AssignmentType.NONE,
		public parent?: ScopeItemCapability,
	) { }

	/**
	 * Recursively build from this node down.
	 */
	build(): void {
		if (this.type === ItemType.REFERENCE) {
			// Link to declaration if it exists.
			this.resolveLinks();
			if (!this.link) {
				// TODO:
				// References to variables should get a diagnostic if they aren't declared.
				//  -- No option explicit: gets a hint with code action to declare.
				//  -- Option explicit: gets an error with code action to declare.
				//  -- Subsequent explicit declaration should raise duplicate declaration (current bahaviour).
				// References to function or sub calls should raise an error if they aren't declared.
				//	-- Must always throw even when option explicit not present.
				//	-- Nothing required on first reference as declaration may come later.
				const diagnosticType = this.assignmentType & AssignmentType.CALL
					? SubOrFunctionNotDefinedDiagnostic
					: VariableNotDefinedDiagnostic;
				this.pushDiagnostic(diagnosticType);
			}
		} else {
			// Diagnostic checks on declarations.
			this.resolveDuplicateDeclarations();
			this.resolveShadowedDeclarations();
		}

		// Call build on children.
		this.types?.forEach(items => items.forEach(item => item.build()));
		this.modules?.forEach(items => items.forEach(item => item.build()));
		this.functions?.forEach(items => items.forEach(item => item.build()));
		this.subroutines?.forEach(items => items.forEach(item => item.build()));
		this.properties?.getters?.forEach(items => items.forEach(item => item.build()));
		this.properties?.letters?.forEach(items => items.forEach(item => item.build()));
		this.properties?.setters?.forEach(items => items.forEach(item => item.build()));

		this.isDirty = false;
	}

	/** Resolves for the current scope, i.e., children of the current item. */
	private resolveDuplicateDeclarations() {
		// Reference types are never relevant.
		if (this.type == ItemType.REFERENCE) {
			return;
		}

		// Track names we've diagnosed to avoid re-diagnosing when we check properties.
		const diagnosedNames = new Map<string, undefined>();

		// Functions and subroutines clash each other.
		// Build map of all suroutines and functions.
		/** Combine {@link ScopeItemCapability} maps by loading items from b into a. */
		const combineNames = (a: Map<string, ScopeItemCapability[]>, b: Map<string, ScopeItemCapability[]> | undefined) => {
			b?.forEach((bItems, name) => a.set(name, [a.get(name) ?? [], bItems].flat()));
			return a;
		};

		const names = new Map<string, ScopeItemCapability[]>();
		combineNames(names, this.types);
		combineNames(names, this.modules);
		combineNames(names, this.functions);
		combineNames(names, this.subroutines);

		const logger = Services.logger;
		names.forEach((items, name) => {
			// Base case no name clash.
			if (items.length <= 1) {
				return;
			}

			// Diagnose names.
			logger.debug(`Name ${name} is duplicate`);
			items.forEach(item => this.pushDiagnostic(DuplicateDeclarationDiagnostic, item, name));
			diagnosedNames.set(name, undefined);
		});

		// Properties clash with properties of same type. Loop through each and check against names.
		Object.entries(this.properties ?? {}).forEach(([_, properties]) => {
			properties?.forEach((items, name) => {
				const nameItems = names.get(this.identifier) ?? [];

				// Base case no name clash.
				if (items.length + nameItems.length === 1) {
					return;
				}

				// Diagnose properties.
				logger.debug(`Property ${items[0].name} is duplicate`);
				items.forEach(item => this.pushDiagnostic(DuplicateDeclarationDiagnostic, item, item.name));

				// Don't diagnose names if we have already or don't need to.
				if (diagnosedNames.has(this.identifier) || nameItems.length === 0) {
					return;
				}

				// Diagnose names and register.
				logger.debug(`Name ${this.identifier} is duplicate (property)`);
				nameItems.forEach(item => this.pushDiagnostic(DuplicateDeclarationDiagnostic, item, name));
				diagnosedNames.set(this.identifier, undefined);
			});
		});
	}

	private addDiagnosticReference(diagnostic: BaseDiagnostic | undefined, item: ScopeItemCapability): void {
		const context = item.element?.context;
		if (!context || !diagnostic) {
			return;
		}

		diagnostic.addRelatedInformation({
			message: "Related Information",
			location: {
				uri: context.document.uri,
				range: context.range
			}
		});
	}

	private resolveShadowedDeclaration(item: ScopeItemCapability | undefined): void {
		if (item) {
			const diagnostic = this.pushDiagnostic(ShadowDeclarationDiagnostic);
			this.addDiagnosticReference(diagnostic, item);
		}
	}

	private resolveShadowedDeclarations() {
		// Get the parent of the scope where this element is registered.
		const parent = this.parent?.parent;
		if (!parent) {
			return;
		}

		// All declaration types check for modules.
		this.resolveShadowedDeclaration(parent.findType(this.identifier));
		this.resolveShadowedDeclaration(parent.findModule(this.identifier));
		this.resolveShadowedDeclaration(parent.findFunction(this.identifier));
		this.resolveShadowedDeclaration(parent.findSubroutine(this.identifier));

		// Properties care about everything except properties that
		// aren't the same type. Everything else cares about everything.

		// ToDo:
		// Variables are registered as props so should also squash their
		// get/set/let diagnostics into one single diagnostic.

		// Check get properties.
		if (this.assignmentType & AssignmentType.GET) {
			this.resolveShadowedDeclaration(parent.findPropertyGetter(this.identifier));
		}

		// Check let properties.
		if (this.assignmentType & AssignmentType.LET) {
			this.resolveShadowedDeclaration(parent.findPropertyLetter(this.identifier));
		}

		// Check set properties.
		if (this.assignmentType & AssignmentType.SET) {
			this.resolveShadowedDeclaration(parent.findPropertySetter(this.identifier));
		}
	}

	private resolveLinks() {
		/**
		 * Call Foo(bar)
		 *      ^^^			NONE
		 * 			^^^		GET
		 * 
		 * Let foo = bar
		 *     ^^^			LET
		 * 			 ^^^	GET
		 * 
		 * Set foo = bar
		 * 	   ^^^			SET
		 * 			 ^^^	GET
		 */

		// Handle calls that aren't assignments.
		if (this.assignmentType === AssignmentType.CALL) {
			this.linkThisToItem(this.findFunction(this.identifier));
			this.linkThisToItem(this.findSubroutine(this.identifier));
			return;
		}

		// Handle get/set/let relationships.
		if (this.assignmentType & AssignmentType.GET) {
			this.linkThisToItem(this.findFunction(this.identifier));
			this.linkThisToItem(this.findPropertyGetter(this.identifier));
			return;
		}

		if (this.assignmentType & AssignmentType.LET) {
			this.linkThisToItem(this.findPropertyLetter(this.identifier));
			return;
		}

		if (this.assignmentType & AssignmentType.SET) {
			this.linkThisToItem(this.findPropertySetter(this.identifier));
			return;
		}
	}

	private linkThisToItem(linkItem?: ScopeItemCapability): void {
		if (!linkItem) {
			return;
		}

		this.link = linkItem;
		linkItem.backLinks ??= [];
		linkItem.backLinks.push(this);
	}

	private removeBacklink(backlinkedItem: ScopeItemCapability): void {
		if (!this.backLinks) {
			return;
		}

		const keep = this.backLinks.filter(x => x !== backlinkedItem);
		this.backLinks = keep.length === 0 ? undefined : keep;
	}

	/** Returns the module this scope item falls under */
	get module(): ScopeItemCapability | undefined {
		if (this.type == ItemType.MODULE) {
			return this;
		}
		return this.parent?.module;
	}

	/** Returns the project this scope item falls under */
	get project(): ScopeItemCapability | undefined {
		if (this.type == ItemType.PROJECT) {
			return this;
		}
		return this.parent?.project;
	}

	get identifier(): string {
		if (this.type === ItemType.PROPERTY) {
			return this.name.split(' ')[1];
		}
		return this.name;
	}

	get name(): string {
		return this.explicitSetName
			?? this.element?.identifierCapability?.name
			?? 'Unknown';
	}

	findType(identifier: string): ScopeItemCapability | undefined {
		return this.types?.get(identifier)?.[0]
			?? this.parent?.findType(identifier);
	}

	findModule(identifier: string): ScopeItemCapability | undefined {
		return this.modules?.get(identifier)?.[0]
			?? this.parent?.findModule(identifier);
	}

	findFunction(identifier: string): ScopeItemCapability | undefined {
		return this.functions?.get(identifier)?.[0]
			?? this.parent?.findFunction(identifier);
	}

	findSubroutine(identifier: string): ScopeItemCapability | undefined {
		return this.subroutines?.get(identifier)?.[0]
			?? this.parent?.findSubroutine(identifier);
	}

	findPropertyGetter(identifier: string): ScopeItemCapability | undefined {
		return this.properties?.getters?.get(identifier)?.[0]
			?? this.parent?.findPropertyGetter(identifier);
	}

	findPropertyLetter(identifier: string): ScopeItemCapability | undefined {
		return this.properties?.letters?.get(identifier)?.[0]
			?? this.parent?.findPropertyLetter(identifier);
	}

	findPropertySetter(identifier: string): ScopeItemCapability | undefined {
		return this.properties?.setters?.get(identifier)?.[0]
			?? this.parent?.findPropertySetter(identifier);
	}

	/**
	 * Registers a scope and returns the new current scope.
	 * @param item The scope item to register.
	 * @returns The current scope.
	 */
	registerScopeItem(item: ScopeItemCapability): ScopeItemCapability {
		// ToDo: Get the parent based on visibility.
		// Public scoped elements should get the project.
		// Check pub/priv declares in same document treated as duplicate instead of shadowed.

		/**
		 *  !! Declaring public things is working :)
		 *     So far: just Enum (need to set up the logic for everything).
		 */

		// Set the parent for the item.
		item.parent = this.isPublicScope ? (this.project ?? this) : this;
		item.parent.isDirty = true;

		let ancestor: ScopeItemCapability | undefined = this;
		let ancestorLevel = 0;
		while (ancestor) {
			ancestorLevel += 1;
			ancestor = ancestor.parent;
		}
		Services.logger.debug(`Registering [${ItemType[item.type]}] ${item.name}`, ancestorLevel);

		// Reference types are not declarations.
		if (item.type === ItemType.REFERENCE) {
			item.parent.references ??= new Map();
			item.parent.addItem(item.parent.references, item);
			return this;
		}

		// Register functions.
		if (item.type === ItemType.FUNCTION) {
			item.parent.functions ??= new Map();
			item.parent.addItem(item.parent.functions, item);
			return item;
		}

		// Register subroutine.
		if (item.type === ItemType.SUBROUTINE) {
			item.parent.subroutines ??= new Map();
			item.parent.addItem(item.parent.subroutines, item);
			return item;
		}

		// Register enum or type.
		if (item.type === ItemType.TYPE) {
			item.parent.types ??= new Map();
			item.parent.addItem(item.parent.types, item);
			return item;
		}

		// Register properties and variables.
		if (item.type === ItemType.PROPERTY || item.type === ItemType.VARIABLE) {
			item.parent.properties ??= {};
			if (item.assignmentType & AssignmentType.GET) {
				item.parent.properties.getters ??= new Map();
				item.parent.addItem(item.parent.properties.getters, item);
			}
			if (item.assignmentType & AssignmentType.LET) {
				item.parent.properties.letters ??= new Map();
				item.parent.addItem(item.parent.properties.letters, item);
			}
			if (item.assignmentType & AssignmentType.SET) {
				item.parent.properties.setters ??= new Map();
				item.parent.addItem(item.parent.properties.setters, item);
			}
			return item.type === ItemType.PROPERTY ? item : this;
		}

		// Handle module registration
		if (item.type === ItemType.MODULE) {
			item.parent.modules ??= new Map();
			item.parent.addItem(item.parent.modules, item);
			return item;
		}

		// Handle container types that aren't registered.
		return item;
	}

	// Would be relatively simple to also do this via a "dirty" flag.
	/** Removes all elements with references to the document uri. */
	invalidate(uri: string): void {
		const unlink = (item: ScopeItemCapability): void => {
			// Remove backlink from linked item.
			item.link?.removeBacklink(item);
			// Remove link from any backlinked items.
			item.backLinks?.forEach(node => node.link = undefined);
		};

		const scan = (map: Map<string, ScopeItemCapability[]> | undefined, uri: string) => {
			if (map === undefined) {
				return;
			}

			const keys = Array.from(map.keys());
			keys.forEach(key => {
				const items = map.get(key)!;
				const keep = items.filter(item => item.element?.context.document.uri !== uri);
				const remove = items.filter(item => item.element?.context.document.uri === uri);

				// Sever links for items to be removed.
				remove.forEach(x => unlink(x));

				// Update the map.
				if (keep.length === 0) {
					map.delete(key);
				} else {
					map.set(key, keep);
				}
			});
		};

		// Invalidate and unlink items.
		scan(this.types, uri);
		scan(this.modules, uri);
		scan(this.functions, uri);
		scan(this.subroutines, uri);
		if (this.properties !== undefined) {
			scan(this.properties.getters, uri);
			scan(this.properties.letters, uri);
			scan(this.properties.setters, uri);
		}
		scan(this.references, uri);

		// Call invalidate on children.
		this.types?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.modules?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.functions?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.subroutines?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.properties?.getters?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.properties?.letters?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.properties?.setters?.forEach(items => items.forEach(item => item.invalidate(uri)));
	}

	private addItem(target: Map<string, ScopeItemCapability[]>, item: ScopeItemCapability): void {
		const items = target.get(item.identifier) ?? [];
		items.push(item);
		target.set(item.identifier, items);
	}

	/**
	 * Generates and pushes a diagnostic to the underlying element on the scope item.
	 * No diagnostic is created unless we have both a range and the capability on the element.
	 * Range is automatically injected into the constructor but arguments can't be verified at compile time, so it's on you to check.
	 * @param ctor The diagnostic we're creating.
	 * @param item The scope item to get the range from.
	 * @param args Any additional constructor args (don't provide the range).
	 * @returns A diagnostic if we have a range and capability.
	 */
	private pushDiagnostic<T extends BaseDiagnostic>(ctor: new (...args: any[]) => T, item?: ScopeItemCapability, ...args: ConstructorParameters<typeof ctor>): T | undefined {
		const range = (item ?? this).element?.identifierCapability?.range;
		const diagnostics = (item ?? this).element?.diagnosticCapability?.diagnostics;
		if (range && diagnostics) {
			const diagnostic = new ctor(...[range, args].flat());
			diagnostics.push(diagnostic);
			return diagnostic;
		}
	}
}