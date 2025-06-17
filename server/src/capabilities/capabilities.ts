// Core
import {
	DiagnosticSeverity,
	LocationLink,
	Position,
	Range,
	SymbolInformation,
	SymbolKind
} from 'vscode-languageserver';

// Antlr
import { ParserRuleContext, TerminalNode } from 'antlr4ng';

// Project
import { Services } from '../injection/services';
import { FoldingRange, FoldingRangeKind } from '../capabilities/folding';
import { SemanticToken, SemanticTokenModifiers, SemanticTokenTypes } from '../capabilities/semanticTokens';
import { BaseRuleSyntaxElement, BaseIdentifyableSyntaxElement, BaseSyntaxElement, Context, HasSemanticTokenCapability } from '../project/elements/base';
import { AmbiguousNameDiagnostic, BaseDiagnostic, DuplicateDeclarationDiagnostic, ShadowDeclarationDiagnostic, SubOrFunctionNotDefinedDiagnostic, UnusedDiagnostic, VariableNotDefinedDiagnostic } from './diagnostics';
import { isPositionInsideRange, isRangeInsideRange, rangeEquals } from '../utils/helpers';


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
	diagnostics: BaseDiagnostic[] = [];
	evaluate: (...args: any[]) => BaseDiagnostic[];

	constructor(element: BaseSyntaxElement, evaluate?: (...args: any[]) => BaseDiagnostic[]) {
		super(element);
		this.evaluate = evaluate ?? (() => this.diagnostics);
	}
}


export class SemanticTokenCapability extends BaseCapability {
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

	constructor(element: BaseRuleSyntaxElement<ParserRuleContext>,
		private tokenType: SemanticTokenTypes,
		private tokenModifiers: SemanticTokenModifiers[],
		private overrideRange?: Range,
		private overrideLength?: number) {
		super(element);
	}
}


export class SymbolInformationCapability extends BaseCapability {
	get SymbolInformation(): SymbolInformation {
		const element = this.element as BaseIdentifyableSyntaxElement<ParserRuleContext>;
		return SymbolInformation.create(
			element.identifierCapability.name,
			this.symbolKind,
			element.context.range,
			element.context.document.uri
		);
	}

	constructor(element: BaseIdentifyableSyntaxElement<ParserRuleContext>, private symbolKind: SymbolKind) {
		super(element);
	}
}


export class IdentifierCapability extends BaseCapability {
	private get unformattedName(): string {
		const nameCtx = this.getNameContext ? this.getNameContext() : this.nameContext;
		return nameCtx?.getText() ?? this.defaultName ?? "Unknown Element";
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


export enum ScopeType {
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
	/** A variable declaration in a signature */
	PARAMETER,
	/** A reference to some type of declaration. */
	REFERENCE,
	/** A special reference type. */
	ATTRIBUTE
}

export enum AssignmentType {
	NONE = 0,
	GET = 1 << 0,
	LET = 1 << 1,
	SET = 1 << 2,
	CALL = 1 << 3,
	CONST = 1 << 4
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
	parameters?: Map<string, ScopeItemCapability[]>;
	references?: Map<string, ScopeItemCapability[]>;
	attributes?: Map<string, ScopeItemCapability[]>;

	// Special scope references for easier resolution of names.
	implicitDeclarations?: Map<string, ScopeItemCapability[]>;

	// Links
	link?: ScopeItemCapability;
	backlinks?: ScopeItemCapability[];

	// Technical
	isDirty: boolean = true;

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

	get explicitDeclarations() {
		const result: Map<string, ScopeItemCapability[]>[] = [];
		const addToResult = (map: Map<string, ScopeItemCapability[]> | undefined) => {
			if (map) result.push(map);
		};
		addToResult(this.types);
		addToResult(this.modules);
		addToResult(this.functions);
		addToResult(this.subroutines);

		return result;
	}

	get hasScopeBody(): boolean {
		return this.type !== ScopeType.VARIABLE
			&& this.type !== ScopeType.REFERENCE
			&& this.type !== ScopeType.PARAMETER;
	}

	get assignmentTypeText(): string {
		const enumNamesAndValues = Object.values(AssignmentType);
		const enumValues = enumNamesAndValues.slice(enumNamesAndValues.length / 2 + 1);
		const result = `${enumValues.map(x => AssignmentType[this.assignmentType & x as number]).filter(x => x !== 'NONE').join('|')}`;

		return result === '' ? 'NONE' : result;
	}

	get range(): Range | undefined {
		return this.element?.context.range;
	}

	// Item Properties
	locationUri?: string;
	isPublicScope?: boolean;
	accessMembers?: ParserRuleContext[];
	isOptionExplicitScope = false;
	classTypeName?: string;

	constructor(
		readonly element?: BaseRuleSyntaxElement<ParserRuleContext>,
		public type: ScopeType = ScopeType.REFERENCE,
		public assignmentType: AssignmentType = AssignmentType.NONE,
		public parent?: ScopeItemCapability,
	) { }

	/**
	 * Recursively build from this node down.
	 */
	build(): void {
		if (this.type === ScopeType.ATTRIBUTE) {
			this.resolveAttribute();
			this.validateAttributes();
		} else if (this.type === ScopeType.REFERENCE) {
			this.resolveLinks();
			this.validateLink();
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
		this.references?.forEach(items => items.forEach(item => item.build()));
		this.attributes?.forEach(items => items.forEach(item => item.build()));

		this.isDirty = false;
	}

	resolveUnused(): void {
		// Don't diagnose projects, classes or modules.
		// Don't diagnose publically declared items.
		// Don't diagnose if we have backlinks.
		const isUsed: boolean = this.type === ScopeType.CLASS
			|| this.type === ScopeType.MODULE
			|| this.isPublicScope
			|| (!!this.backlinks && this.backlinks.length > 0)
			|| !this.element
			|| !this.element.identifierCapability;

		if (!isUsed) {
			const identifier = this.element?.identifierCapability;
			const diagnostics = this.element?.diagnosticCapability?.diagnostics;
			if (identifier && diagnostics) {
				diagnostics.push(new UnusedDiagnostic(identifier.range, identifier.name));
			}
		}

		if (!this.hasScopeBody) {
			return;
		}

		// Recursively call this method on child declarations.
		this.types?.forEach(items => items.forEach(item => item.resolveUnused()));
		this.modules?.forEach(items => items.forEach(item => item.resolveUnused()));
		this.functions?.forEach(items => items.forEach(item => item.resolveUnused()));
		this.subroutines?.forEach(items => items.forEach(item => item.resolveUnused()));
		this.properties?.getters?.forEach(items => items.forEach(item => item.resolveUnused()));
		this.properties?.letters?.forEach(items => items.forEach(item => item.resolveUnused()));
		this.properties?.setters?.forEach(items => items.forEach(item => item.resolveUnused()));
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
		if (this.type == ScopeType.REFERENCE) {
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

	private resolveShadowedDeclarations(ancestors: ScopeItemCapability[]) {
		// Don't check for shadowed declarations if we're above project level.
		if (ancestors.length < 3) {
			return;
		}

		for (let i = 2; i < ancestors.length; i++) {
			const ancestor = ancestors[i];
			const shadowing = ancestor
				.getAccessibleScopes(this.name)
				.filter(item => item.parent?.name !== this.parent?.name);

			if (shadowing.length > 0) {
				const diagnostic = this.pushDiagnostic(ShadowDeclarationDiagnostic, this, this.name);
				if (diagnostic === undefined) {
					continue;
				}
				shadowing.forEach(item => this.addDiagnosticReference(diagnostic, item));
			}
		}
	}

	private resolveAttribute() {
		/**
		 * Most attributes will be belong to the parent. Variable attributes
		 * will belong to the same scope as the item they refer to.
		 * 
		 * We set one way links here to facilitate renaming.
		 * Setting an attribute as a back link will impact unused diagnostics.
		*/

		if (!this.parent) {
			Services.logger.error(`Expected parent for attribute ${this.name}`);
			throw new Error("Attribute scope item has no parent.");
		}

		// The immediate parent is probably the linked item.
		if (this.name === this.parent.name) {
			this.link = this.parent;
			return;
		}

		// If not, we may be a variable attribute (shared parent).
		const declarations = this.parent.properties?.getters?.get(this.name);
		if (!declarations) {
			return;
		}

		// Handle a single declaration found.
		if (declarations.length === 1) {
			this.link = declarations[0];
			this.parent.moveAttribute(this, declarations[0]);
			return;
		}

		// Handle duplicate declarations by attaching to the closest above.
		const targetRow = this.range?.start.line ?? 0;
		let closestDeclaration: ScopeItemCapability | undefined;
		for (const declaration of declarations) {
			const declarationRow = declaration?.range?.start.line ?? 0;
			if (declarationRow === 0 || declarationRow >= targetRow) {
				return;
			}

			if (!closestDeclaration) {
				closestDeclaration = declaration;
				return;
			}

			const closestRow = closestDeclaration.range?.start.line ?? 0;
			if (targetRow > declarationRow && declarationRow > closestRow) {
				closestDeclaration = declaration;
			}
		}

		if (closestDeclaration) {
			this.link = closestDeclaration;
			this.parent.moveAttribute(this, closestDeclaration);
		}
	}

	moveAttribute(attr: ScopeItemCapability, destination: ScopeItemCapability) {
		const items = this.attributes?.get(attr.name);
		if (!items || items.length === 0) {
			return;
		}

		const unmoved: ScopeItemCapability[] = [];
		items.forEach(item => {
			const isLocMatch = item.locationUri === attr.locationUri;
			const isRangeMatch = rangeEquals(item.element?.context.range, attr.range);
			if (isLocMatch && isRangeMatch) {
				destination.attributes ??= new Map();
				destination.addItem(destination.attributes, item);
			} else {
				unmoved.push(item);
			}
		});
	}

	private validateAttributes() {
		// Attributes must be in specific locations to work.
	}

	private resolveLinks() {

		// Resolve where we have no member access names.
		if (!this.accessMembers || this.accessMembers.length === 0) {
			const declarations = this.findDeclarations(this.identifier, this.assignmentType);
			if (declarations === undefined || declarations.length === 0) {
				return;
			}

			if (declarations.length > 1) {
				const diagnostic = this.pushDiagnostic(AmbiguousNameDiagnostic, this, this.identifier);
				this.addScopesAsRelatedInformation(diagnostic, declarations);
				return;
			}

			this.linkThisToItem(declarations[0]);
			return;
		}

		// Resolve for member accessed names.
		let foundDeclarations: ScopeItemCapability[] = [];
		for (const [i, ctx] of this.accessMembers.entries()) {
			// Get the scope item to search and exit if we don't have anything.
			const searchScope = i === 0 ? this
				: foundDeclarations.length === 0
					? this.project
					: foundDeclarations[0];

			// Can't do anything more if we don't have a scope to search.
			if (searchScope === undefined) {
				return;
			}

			// Get the details of what we're searching for.
			const name = ctx.getText();
			const assignmentType = i < this.accessMembers.length - 1
				? AssignmentType.GET
				: this.assignmentType;

			// Search the immediate scope hierarchy if this is the first member.
			foundDeclarations = searchScope.findDeclarations(name, assignmentType) ?? [];

			// If we didn't find anything, try searching the type.
			if (foundDeclarations.length === 0 && searchScope.classTypeName !== undefined) {
				foundDeclarations = this.project?.findDeclarations(searchScope.classTypeName, assignmentType) ?? [];
				foundDeclarations = foundDeclarations[0]?.findDeclarations(name, assignmentType) ?? [];
			}

			// Exactly one means we found something.
			if (foundDeclarations.length === 1) {
				continue;
			}

			// Nothing found means we can't continue.
			if (foundDeclarations.length === 0) {
				return;
			}

			// More than one declaration is ambiguous.
			if (foundDeclarations.length > 1) {
				const document = this.element?.context.document;
				if (document) {
					const diagnostic = new AmbiguousNameDiagnostic(ctx.toRange(document), '');
					this.addScopesAsRelatedInformation(diagnostic, foundDeclarations);
				}
				return;
			}
		}

		// If we get here, we have resolved the member access name.
		this.linkThisToItem(foundDeclarations[0]);
	}

	private validateLink() {
		if (!this.link) {
			// TODO:
			// References to variables should get a diagnostic if they aren't declared.
			//  -- No option explicit: Hint with code action to declare.
			//						   GET before declared gets a warning.
			//  -- Option explicit: Error with code action to declare.
			//  -- Subsequent explicit declaration should raise duplicate declaration (current bahaviour).
			// 	-- All declarations with no GET references get a warning.
			// References to function or sub calls should raise an error if they aren't declared.
			//	-- Must always throw even when option explicit not present.
			//	-- Nothing required on first reference as declaration may come later.
			const severity = this.isOptionExplicitScope
				? DiagnosticSeverity.Error
				: DiagnosticSeverity.Hint;
			const _ = this.assignmentType & AssignmentType.CALL
				? this.pushDiagnostic(SubOrFunctionNotDefinedDiagnostic, this, this.name)
				: this.pushDiagnostic(VariableNotDefinedDiagnostic, this, this.name, severity);
		}
	}

	private linkThisToItem(linkItem?: ScopeItemCapability): void {
		if (!linkItem) {
			return;
		}

		this.link = linkItem;
		linkItem.backlinks ??= [];
		linkItem.backlinks.push(this);
	}

	/** Returns the module this scope item falls under */
	get module(): ScopeItemCapability | undefined {
		if (this.type === ScopeType.MODULE || this.type === ScopeType.CLASS) {
			return this;
		}
		return this.parent?.module;
	}

	/** Returns the project this scope item falls under */
	get project(): ScopeItemCapability | undefined {
		if (this.type == ScopeType.PROJECT) {
			return this;
		}
		return this.parent?.project;
	}

	get identifier(): string {
		if (this.type === ScopeType.PROPERTY) {
			return this.name.split(' ')[1];
		}
		return this.name;
	}

	get name(): string {
		return this.element?.identifierCapability?.name ?? 'Unknown';
	}

	has(identifier: string): boolean {
		for (const map of this.maps) {
			if (map.has(identifier)) {
				return true;
			}
		}
		return false;
	}

	/** Get accessible declarations matching name. */
	getAccessibleScopes(identifier: string, results: ScopeItemCapability[] = []): ScopeItemCapability[] {
		this.types?.get(identifier)?.forEach(scope => results.push(scope));
		this.modules?.get(identifier)?.forEach(scope => results.push(scope));
		this.functions?.get(identifier)?.forEach(scope => results.push(scope));
		this.subroutines?.get(identifier)?.forEach(scope => results.push(scope));
		if (this.properties) {
			this.properties.getters?.get(identifier)?.forEach(scope => results.push(scope));
			this.properties.letters?.get(identifier)?.forEach(scope => results.push(scope));
			this.properties.setters?.get(identifier)?.forEach(scope => results.push(scope));
		}
		this.parameters?.get(identifier)?.forEach(scope => results.push(scope));
		return this.parent?.getAccessibleScopes(identifier, results) ?? results;
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

	findDeclarations(identifier: string, assignmentType: AssignmentType): ScopeItemCapability[] | undefined {
		const explicitResult = this.explicitDeclarations
			.map(x => x.get(identifier))
			.filter(x => !!x)
			.flat();

		if (assignmentType & AssignmentType.GET) {
			this.properties?.getters?.get(identifier)?.forEach(x =>
				explicitResult.push(x)
			);
		}

		if (assignmentType & AssignmentType.SET) {
			this.properties?.setters?.get(identifier)?.forEach(x =>
				explicitResult.push(x)
			);
		}

		if (assignmentType & AssignmentType.LET) {
			this.properties?.letters?.get(identifier)?.forEach(x =>
				explicitResult.push(x)
			);
		}

		if (explicitResult.length > 0) {
			return explicitResult;
		}

		const implicitResult = this.implicitDeclarations
			?.get(identifier);

		if (implicitResult && implicitResult.length > 0) {
			return implicitResult;
		}

		return this.parent?.findDeclarations(identifier, assignmentType);
	}

	/**
	 * Registers a scope and returns the new current scope.
	 * @param item The scope item to register.
	 * @returns The current scope.
	 */
	registerScopeItem(item: ScopeItemCapability): ScopeItemCapability {
		// Set the parent for the item.
		item.parent = this; // getParent(item);
		item.parent.isDirty = true;

		// Set the URI from the parent if we don't have one.
		if (item.locationUri === undefined) {
			item.locationUri = item.parent.locationUri;
		}

		// Get the scope level for logging.
		const getAncestorLevel = (item: ScopeItemCapability, level: number): number =>
			item.parent ? getAncestorLevel(item.parent, level + 1) : level;


		item.isPublicScope = this.getVisibility(item);
		const visibility = item.isPublicScope ? 'public' : 'private';
		const assignment = item.assignmentTypeText;
		const ancestorLevel = getAncestorLevel(this, 0);
		Services.logger.debug(`Registering [${visibility} ${ScopeType[item.type]} ${assignment}] ${item.name}`, ancestorLevel);

		// Inherit option explicit property.
		if (item.parent.isOptionExplicitScope) {
			this.isOptionExplicitScope = true;
		}

		// Reference types are not declarations.
		if (item.type === ScopeType.REFERENCE) {
			item.parent.references ??= new Map();
			item.parent.addItem(item.parent.references, item);
			return this;
		}

		// Register attributes
		if (item.type === ScopeType.ATTRIBUTE) {
			item.parent.attributes ??= new Map();
			item.parent.addItem(item.parent.attributes, item);
			return this;
		}

		// Add implicitly accessible names to the project scope.
		if (item.isPublicScope && this.project && this !== this.project) {
			this.project.implicitDeclarations ??= new Map();
			this.addItem(this.project.implicitDeclarations, item, item.name);
		}

		// Register functions.
		if (item.type === ScopeType.FUNCTION) {
			item.parent.functions ??= new Map();
			item.parent.addItem(item.parent.functions, item);
			return item;
		}

		// Register subroutine.
		if (item.type === ScopeType.SUBROUTINE) {
			item.parent.subroutines ??= new Map();
			item.parent.addItem(item.parent.subroutines, item);
			return item;
		}

		// Register enum or type.
		if (item.type === ScopeType.TYPE) {
			item.parent.types ??= new Map();
			item.parent.addItem(item.parent.types, item);
			return item;
		}

		// Register parameters.
		if (item.type === ScopeType.PARAMETER) {
			item.parent.parameters ??= new Map();
			item.parent.addItem(item.parent.parameters, item);
		}

		// Register properties and variables.
		const isGetSetLetType = item.type === ScopeType.PROPERTY
			|| item.type === ScopeType.VARIABLE
			|| item.type === ScopeType.PARAMETER;
		if (isGetSetLetType) {
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
			return item.type === ScopeType.PROPERTY ? item : this;
		}

		// Handle module registration
		if (item.type === ScopeType.MODULE || item.type === ScopeType.CLASS) {
			item.parent.modules ??= new Map();
			item.parent.addItem(item.parent.modules, item);
			return item;
		}

		// Handle container types that aren't registered.
		return item;
	}

	/**
	 * Recursively removes all scopes with the passed in uri and
	 * within the range bounds, including where it is linked.
	 */
	invalidate(uri: string, range?: Range): void {
		const cleanScopes = (scopes?: ScopeItemCapability[]) => {
			if (scopes === undefined) {
				return undefined;
			}

			const result: ScopeItemCapability[] = [];
			scopes.forEach(scope => {
				if (scope.isLocatedAt(uri, range)) {
					Services.logger.debug(`Invalidating ${scope.name}`);

					// Clean the backlinks on the linked item if we have one.
					if (scope.link) scope.link.backlinks = cleanScopes(
						scope.link.backlinks);

					// Clean the invaludated scope.
					scope.invalidate(uri, scope.range);
					
					return;
				}
				result.push(scope);
			});
			return result;
		};

		const cleanMap = (map?: Map<string, ScopeItemCapability[]>) => {
			if (map === undefined) {
				return undefined;
			}

			const result = new Map<string, ScopeItemCapability[]>();
			for (const [name, scopes] of map) {
				const cleanedScopes = cleanScopes(scopes);
				if (cleanedScopes && cleanedScopes.length > 0) {
					result.set(name, cleanedScopes);
				}
			}

			if (result.size > 0) {
				return result;
			}
		};

		this.types = cleanMap(this.types);
		this.modules = cleanMap(this.modules);
		this.functions = cleanMap(this.functions);
		this.subroutines = cleanMap(this.subroutines);
		if (this.properties) {
			this.properties.getters = cleanMap(this.properties.getters);
			this.properties.letters = cleanMap(this.properties.letters);
			this.properties.setters = cleanMap(this.properties.setters);
		}
		this.parameters = cleanMap(this.parameters);
		this.implicitDeclarations = cleanMap(this.implicitDeclarations);

		// Do a basic clean on backlinks that doesn't trigger recursion.
		if (this.backlinks) {
			this.backlinks = this.backlinks
				.filter(scope => !scope.isLocatedAt(uri, range));
		}
	}

	/** Returns true if the uri matches and, if passed, range is fully inside range. */
	isLocatedAt(uri: string, range?: Range): boolean {
		if (uri !== this.locationUri) {
			return false;
		}

		if (!range) {
			return true;
		}

		return isRangeInsideRange(this.range, range);
	}

	/** Returns true for public and false for private */
	private getVisibility(item: ScopeItemCapability): boolean {
		// Classes and modules are always public.
		if (item.parent?.type === ScopeType.PROJECT) {
			return true;
		}

		// Module members can explicitly set their access or default
		// to private. TODO: multi-project requires another scope layer 
		// to control access between projects.
		// Public members of Option Private Modules are scoped to project.
		if (item.parent?.type === ScopeType.MODULE) {
			// Variables default to private, everything else deafults public.
			return item.isPublicScope ?? item.type !== ScopeType.VARIABLE;
		}

		// Everything else is private.
		return false;
	}

	private findModuleByUri(uri: string): ScopeItemCapability | undefined {
		const moduleName = uri.split('/').at(-1)?.split('.').slice(0, -1).join('.');
		if (!moduleName) {
			Services.logger.error(`Bad URI or name: ${moduleName} from ${uri}`);
			return;
		}

		const modules = this.modules?.get(moduleName);
		if (!modules) {
			Services.logger.error(`No such module: ${moduleName}`);
			return;
		}

		if (modules.length > 1) {
			Services.logger.error(`Module name ambiguity: ${modules.length} found.`);
			return;
		}

		return modules[0];
	}

	private getItemsIdentifiedAtPosition(position: Position, results: ScopeItemCapability[] = [], searchItems: ScopeItemCapability[] = []): void {
		while (searchItems.length > 0) {
			// Get the next scope to search.
			const scope = searchItems.pop();
			if (scope === undefined) continue;

			// Get the standard maps and add attributes to them if they exist.
			const scopeMaps = scope.maps ?? [];
			if (scope.attributes) scopeMaps.push(scope.attributes);

			// Check all items for whether they have a name overlap or a scope overlap.
			scopeMaps.forEach(map => map.forEach(items => items.forEach(item => {
				const elementRange = item.range;
				const identifierRange = item.element?.identifierCapability?.range;
				if (identifierRange && isPositionInsideRange(position, identifierRange)) {
					// Position is inside the identifier, push to results.
					results.push(item);
				} else if (elementRange && isPositionInsideRange(position, elementRange)) {
					// Position is inside element, queue to be searched.
					searchItems.push(item);
				}
			})));
		}
	}

	getRenameItems(uri: string, position: Position): ScopeItemCapability[] {
		const moduleScope = this.findModuleByUri(uri);
		if (!moduleScope) {
			return [];
		}

		const itemsAtPosition: ScopeItemCapability[] = [];
		this.getItemsIdentifiedAtPosition(position, itemsAtPosition, [moduleScope]);
		if (itemsAtPosition.length === 0) {
			Services.logger.warn(`Nothing to rename.`);
			return [];
		}

		// Switch to the linked declaration if we have one.
		const swapRefsForDeclarations = itemsAtPosition.map(
			item => item.link ? item.link : item);

		// Replace property items with all properties of same name.
		const propertyIncludedItems = swapRefsForDeclarations.map(item =>
			item.type === ScopeType.PROPERTY && item.parent?.properties
				? [
					item.parent.properties.getters?.get(item.identifier),
					item.parent.properties.setters?.get(item.identifier),
					item.parent.properties.letters?.get(item.identifier)
				]
				: item
		).flat(2).filter(x => !!x);

		// Add backlinks and attributes for each item.
		const addedReferences = propertyIncludedItems.map(item => [
			item.backlinks ? [item, ...item.backlinks] : item,
			item.attributes?.get(item.name) ? [item, ...item.attributes.get(item.name)!] : item
		]).flat(2);

		const uniqueItemsAtPosition = this.removeDuplicatesByRange(addedReferences);
		return uniqueItemsAtPosition;
	}

	getDeclarationLocation(uri: string, position: Position): LocationLink[] | undefined {
		const module = this.findModuleByUri(uri);
		if (!module) {
			return;
		}

		const itemsAtPosition: ScopeItemCapability[] = [];
		this.getItemsIdentifiedAtPosition(position, itemsAtPosition, [module]);
		return itemsAtPosition.map(x => x.toLocationLink()).filter(x => !!x);
	}

	toLocationLink(): LocationLink | undefined {
		const link = this.link;

		if (!link || !link.locationUri || !link.element || !link.element.identifierCapability) {
			return;
		}

		return LocationLink.create(
			link.locationUri,
			link.element.context.range,
			link.element.identifierCapability.range,
			this.range
		);
	}

	private addItem(target: Map<string, ScopeItemCapability[]>, item: ScopeItemCapability, name?: string): void {
		const items = target.get(item.identifier) ?? [];
		items.push(item);
		target.set(name ?? item.identifier, items);
	}

	private hasDiagnostic(diagnostic: BaseDiagnostic): boolean {
		const diagnostics = this.element?.diagnosticCapability?.diagnostics;
		if (!diagnostics || diagnostics.length === 0) {
			return false;
		}

		for (const pushedDiagnostic of diagnostics) {
			if (diagnostic.equals(pushedDiagnostic)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Generates and pushes a diagnostic to the underlying element on the scope item.
	 * No diagnostic is created unless we have a range, the capability on the element, and no duplicate exists.
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
			if (this.hasDiagnostic(diagnostic)) {
				return;
			}
			diagnostics.push(diagnostic);
			return diagnostic;
		}
	}

	private addScopesAsRelatedInformation(diagnostic: BaseDiagnostic | undefined, items: ScopeItemCapability[]): void {
		if (diagnostic === undefined) {
			return;
		}

		items.forEach(item => {
			const ctx = item.element?.context;
			if (ctx === undefined) {
				return;
			}
			diagnostic.addRelatedInformation({
				message: "Related Information",
				location: {
					uri: ctx.document.uri,
					range: ctx.range
				}
			});
		});
	}

	private removeDuplicatesByRange(results: ScopeItemCapability[]): ScopeItemCapability[] {
		const rangeString = (r: Range | undefined): string => {
			if (!r) return 'null';
			return `${r.start.line}.${r.start.character}:${r.end.line}.${r.end.character}`;
		};

		const m = new Map<string, ScopeItemCapability>();
		results.forEach(s => m.set(rangeString(s.range), s));
		return Array.from(m.values());
	}
}