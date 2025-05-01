// Core
import {
	DiagnosticSeverity,
	Range,
	SemanticTokenModifiers,
	SemanticTokenTypes,
	SymbolInformation,
	SymbolKind
} from 'vscode-languageserver';

// Antlr
import { ParserRuleContext, TerminalNode } from 'antlr4ng';

// Project
import { BaseModuleElement } from '../project/elements/module';
import { SemanticToken } from '../capabilities/semanticTokens';
import { FoldingRange, FoldingRangeKind } from '../capabilities/folding';
import { BaseRuleSyntaxElement, BaseIdentifyableSyntaxElement, BaseSyntaxElement, Context, HasSemanticTokenCapability } from '../project/elements/base';
import { BaseDiagnostic, DuplicateDeclarationDiagnostic, MethodVariableIsPublicDiagnostic, ShadowDeclarationDiagnostic, SubOrFunctionNotDefinedDiagnostic, VariableNotDefinedDiagnostic } from './diagnostics';
import { Services } from '../injection/services';


abstract class BaseCapability {
	element: BaseRuleSyntaxElement<ParserRuleContext> | BaseSyntaxElement;

	constructor(element: BaseRuleSyntaxElement<ParserRuleContext> | BaseSyntaxElement) {
		this.element = element;
	}
}


export class FoldingRangeCapability extends BaseCapability {
	foldingRangeKind?: FoldingRangeKind;
	openWord?: string;
	closeWord?: string;

	get foldingRange(): FoldingRange {
		// Cast the element to the same type we get in the constructor.
		const element = this.element as unknown as BaseRuleSyntaxElement<ParserRuleContext>;

		const trailingLineCount = element.context.rule.countTrailingLineEndings();
		const start = element.context.range.start;
		const end = {
			line: element.context.range.end.line - trailingLineCount,
			character: element.context.range.end.character
		};
		const range = Range.create(start, end);
		return new FoldingRange(range, this.foldingRangeKind, this.openWord, this.closeWord);
	}

	constructor(element: BaseRuleSyntaxElement<ParserRuleContext>, foldingRangeKind?: FoldingRangeKind) {
		super(element);
		this.foldingRangeKind = foldingRangeKind;
	}
}


export class DiagnosticCapability extends BaseCapability {
	diagnostics: Diagnostic[] = [];
	evaluate: (...args: any[]) => Diagnostic[];

	constructor(element: BaseSyntaxElement, evaluate?: (...args: any[]) => Diagnostic[]) {
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
		const element = this.element as BaseRuleSyntaxElement<ParserRuleContext> & HasSemanticTokenCapability;
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

	constructor(element: BaseRuleSyntaxElement<ParserRuleContext> & HasSemanticTokenCapability, tokenType: SemanticTokenTypes, tokenModifiers: SemanticTokenModifiers[], overrideRange?: Range, overrideLength?: number) {
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


export class IdentifierCapability extends BaseCapability {
	private get unformattedName(): string {
		return this.nameContext?.getText() ?? this.defaultName ?? "Unknown Element";
	}

	get name(): string {
		return this.formatName
			? this.formatName(this.unformattedName)
			: this.unformattedName;
	}

	get range(): Range {
		if (this.getNameContext) {
			const ctx = this.getNameContext();
			if (ctx) {
				return ctx.toRange(this.element.context.document);
			} else if (this.defaultRange) {
				return this.defaultRange();
			}
			Services.logger.warn(`Unable to get name context or default for ${this.name}`);
		}
		return this.element.context.range;
	}

	get nameContext(): ParserRuleContext | TerminalNode {
		return this.getNameContext
			? this.getNameContext() ?? this.element.context.rule
			: this.element.context.rule;
	}

	get isDefaultMode(): boolean {
		return !(!!this.getNameContext && !!this.getNameContext());
	}

	constructor(
		readonly element: BaseRuleSyntaxElement<ParserRuleContext>,
		private getNameContext?: () => ParserRuleContext | TerminalNode | null | undefined,
		private formatName?: (name: string) => string,
		private defaultName?: string,
		private defaultRange?: () => Range
	) {
		super(element);
	}
}


export enum ItemType {
	/** Base language. */
	VBA,
	/** Application model. */
	APPLICATION,
	/** The user's project. */
	PROJECT,
	/** Class/Form. */
	CLASS,
	/** Module. */
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
	isInvalidated = false;
	private get isMethodScope(): boolean {
		return [
			ItemType.SUBROUTINE,
			ItemType.FUNCTION,
			ItemType.PROPERTY,
		].includes(this.type);
	}
	get maps() {
		const result: Map<string, ScopeItemCapability[]>[] = [];
		const addToResult = (map: Map<string, ScopeItemCapability[]> | undefined) => {
			if (map) result.push(map);
		};
		addToResult(this.types);
		addToResult(this.modules);
		addToResult(this.functions);
		addToResult(this.subroutines);
		addToResult(this.properties?.getters);
		addToResult(this.properties?.letters);
		addToResult(this.properties?.setters);
		addToResult(this.references);

		return result;
	}

	// Item Properties
	explicitSetName?: string;
	isPublicScope = false;
	visibilityModifierContext?: ParserRuleContext;

	constructor(
		readonly element?: BaseRuleSyntaxElement<ParserRuleContext>,
		public type: ItemType = ItemType.REFERENCE,
		public assignmentType: AssignmentType = AssignmentType.NONE,
		public parent?: ScopeItemCapability,
	) { }

	/**
	 * Recursively build from this node down.
	 */
	build(): void {
		// Remove children that are invalidated.
		this.maps.forEach(map => {
			for (const [key, items] of map) {
				const keep = items.filter(x => !x.isInvalidated);
				if (keep.length === 0) map.delete(key);
				else map.set(key, keep);
			}
		});

		// Clean invalidated links.
		if (this.link?.isInvalidated) this.link = undefined;
		if (this.backLinks) {
			const keep = this.backLinks.filter(x => !x.isInvalidated);
			this.backLinks = keep.length > 0 ? keep : undefined;
		}

		// Don't build self if invalidated.
		if (this.isInvalidated) {
			return;
		}

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
				const severity = (this.module?.element as BaseModuleElement<ParserRuleContext>).hasOptionExplicit
					? DiagnosticSeverity.Error
					: DiagnosticSeverity.Warning;
				const _ = this.assignmentType & AssignmentType.CALL
					? this.pushDiagnostic(SubOrFunctionNotDefinedDiagnostic, this, this.name)
					: this.pushDiagnostic(VariableNotDefinedDiagnostic, this, this.name, severity);
			}
		} else {
			// Diagnostic checks on declarations.
			const ancestors = this.getParentChain();
			this.resolveDuplicateDeclarations(ancestors);
			this.resolveShadowedDeclarations(ancestors);
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

	/** Returns the chain of parents for bottom up name resolution. */
	getParentChain(items: ScopeItemCapability[] = []): ScopeItemCapability[] {
		items.push(this);
		return this.parent?.getParentChain(items) ?? items;
	}

	/** Prints the hierarchy of scopes from this node down. */
	printToDebug(level: number = 0) {
		const p = this.isPublicScope ? '[P] ' : '    ';
		Services.logger.debug(`${p}${this.name}`, level);

		this.maps.forEach(
			maps => maps.forEach(
				items => items.forEach(
					item => item.printToDebug(level + 1)
				)));
	}

	/** Resolves for the current scope, i.e., children of the current item. */
	private resolveDuplicateDeclarations(ancestors: ScopeItemCapability[]) {
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

		names.forEach((items, name) => {
			// Base case no name clash.
			if (items.length <= 1) {
				return;
			}

			// Diagnose names.
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
				items.forEach(item => this.pushDiagnostic(DuplicateDeclarationDiagnostic, item, item.name));

				// Don't diagnose names if we have already or don't need to.
				if (diagnosedNames.has(this.identifier) || nameItems.length === 0) {
					return;
				}

				// Diagnose names and register.
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

	private resolveShadowedDeclarations(ancestors: ScopeItemCapability[]) {
		// Don't check for shadowed declarations if we're above project level.
		if (ancestors.length < 3) {
			return;
		}

		for (let i = 2; i < ancestors.length; i++) {
			const ancestor = ancestors[i];
			const shadowing = ancestor.getAccessibleScopes(this.name);

			if (shadowing) {
				const diagnostic = this.pushDiagnostic(ShadowDeclarationDiagnostic);
				shadowing.forEach(item => this.addDiagnosticReference(diagnostic, item));
			}

			// // All declaration types check for modules.
			// this.resolveShadowedDeclaration(parent.findType(this.identifier));
			// this.resolveShadowedDeclaration(parent.findModule(this.identifier));
			// this.resolveShadowedDeclaration(parent.findFunction(this.identifier));
			// this.resolveShadowedDeclaration(parent.findSubroutine(this.identifier));

			// // Properties care about everything except properties that
			// // aren't the same type. Everything else cares about everything.

			// // ToDo:
			// // Variables are registered as props so should also squash their
			// // get/set/let diagnostics into one single diagnostic.

			// // Check get properties.
			// if (this.assignmentType & AssignmentType.GET) {
			// 	this.resolveShadowedDeclaration(parent.findPropertyGetter(this.identifier));
			// }

			// // Check let properties.
			// if (this.assignmentType & AssignmentType.LET) {
			// 	this.resolveShadowedDeclaration(parent.findPropertyLetter(this.identifier));
			// }

			// // Check set properties.
			// if (this.assignmentType & AssignmentType.SET) {
			// 	this.resolveShadowedDeclaration(parent.findPropertySetter(this.identifier));
			// }
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
		if (this.type === ItemType.MODULE || this.type === ItemType.CLASS) {
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

	/** Get accessible declarations */
	getAccessibleScopes(identifier: string, results: ScopeItemCapability[] = []): ScopeItemCapability[] {
		// Add any non-public items we find at this level.
		this.maps.forEach(map => {
			map.get(identifier)?.forEach(item => {
				if (!item.isPublicScope) {
					results.push(item);
				}
			});
		});

		// Get all public scope types if we're at the project level.
		if (this.type === ItemType.PROJECT) {
			this.modules?.forEach(modules => modules.forEach(
				module => module.maps.forEach(map => {
					map.get(identifier)?.forEach(item => {
						if (item.isPublicScope) {
							results.push(item);
						}
					});
				})
			));
		}

		return this.parent?.getAccessibleScopes(identifier, results) ?? results;
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
		 * Visibility on a method-scoped variable does nothing but isn't invalid.
		 * These should declare as if they're private and raise a warning.
		 * 
		 * Only MODULE scoped items are accessible implicitly in PROJECT scope and therefore
		 * only they should be 'escalated' to that scope.
		 */
		// const getParent = (item: ScopeItemCapability): ScopeItemCapability =>
		// 	(item.isPublicScope && this.type === ItemType.MODULE ? this.project : this) ?? this;

		// // Method-scoped variables are always private. 
		// if (this.isMethodScope && item.type === ItemType.VARIABLE && item.isPublicScope) {
		// 	item.isPublicScope = false;
		// 	if (item.visibilityModifierContext && item.element) {
		// 		const ctx = item.visibilityModifierContext;
		// 		const diagnostic = new MethodVariableIsPublicDiagnostic(
		// 			ctx.toRange(item.element.context.document),
		// 			ItemType[this.type]
		// 		);
		// 		item.element?.diagnosticCapability?.diagnostics.push(diagnostic);
		// 	}
		// }

		// Immediately invalidate if we're an Unknown Module
		if (item.type === ItemType.MODULE && item.name === 'Unknown Module') {
			item.isInvalidated = true;
		}

		// Set the parent for the item.
		item.parent = this; // getParent(item);
		item.parent.isDirty = true;

		// Get the scope level for logging.
		const getAncestorLevel = (item: ScopeItemCapability, level: number): number =>
			item.parent ? getAncestorLevel(item.parent, level + 1) : level;
		const ancestorLevel = getAncestorLevel(this, 0);
		Services.logger.debug(`Registering [${item.isPublicScope ? 'public' : 'private'} ${ItemType[item.type]}] ${item.name}`, ancestorLevel);

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
		if (item.type === ItemType.MODULE || item.type === ItemType.CLASS) {
			item.parent.modules ??= new Map();
			item.parent.addItem(item.parent.modules, item);
			return item;
		}

		// Handle container types that aren't registered.
		return item;
	}

	invalidate(uri: string): void {
		if (this.type !== ItemType.PROJECT) {
			this.isInvalidated = true;
		}
		this.types?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.modules?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.functions?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.subroutines?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.properties?.getters?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.properties?.letters?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.properties?.setters?.forEach(items => items.forEach(item => item.invalidate(uri)));
		this.references?.forEach(items => items.forEach(item => item.invalidate(uri)));
	}

	// Would be relatively simple to also do this via a "dirty" flag.
	/** Removes all elements with references to the document uri. */
	invalidate2(uri: string): void {
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