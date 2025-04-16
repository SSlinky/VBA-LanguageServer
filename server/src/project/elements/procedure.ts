//Core
import { SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ParserRuleContext } from 'antlr4ng';
import {
	AmbiguousIdentifierContext,
	AttributeStatementContext,
	FunctionDeclarationContext,
	ProcedureScopeContext,
	PropertyGetDeclarationContext,
	PropertySetDeclarationContext,
	SubroutineDeclarationContext
} from '../../antlr/out/vbaParser';

// Project
import { BaseRuleSyntaxElement, HasDiagnosticCapability, HasSymbolInformationCapability } from './base';
import { AssignmentType, DiagnosticCapability, FoldingRangeCapability, IdentifierCapability, ItemType, ScopeItemCapability, SymbolInformationCapability } from '../../capabilities/capabilities';

interface HasProcedureScope {
	procedureScope(): ProcedureScopeContext | null
}

abstract class BaseProcedureElement<T extends ParserRuleContext & HasProcedureScope> extends BaseRuleSyntaxElement<T> implements HasDiagnosticCapability, HasSymbolInformationCapability {
	diagnosticCapability: DiagnosticCapability;
	foldingRangeCapability: FoldingRangeCapability;
	symbolInformationCapability: SymbolInformationCapability;
	scopeItemCapability: ScopeItemCapability;
	attributes: AttributeStatementContext[] = [];
	abstract identifierCapability: IdentifierCapability;

	constructor(ctx: T, doc: TextDocument, symbolKind: SymbolKind) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.symbolInformationCapability = new SymbolInformationCapability(this, symbolKind);
		this.scopeItemCapability = new ScopeItemCapability(this);
		this.scopeItemCapability.isPublicScope = this.isPublicScope;
	}

	protected get isPublicScope(): boolean {
		return !this.context.rule.procedureScope()?.PRIVATE();
	}

	// ToDo:
	// Add a diagnostic when the attribute name doesn't match the method name.
}

// ToDo: When events are implemented, need to update a sub to take into account the special
//		 significance of an underscore, e.g., MyEventEmiiter_OnEmit()
// 		 Might be good to visually distinguish an event as recognised by a Private WithEvents MyEventEmitter.
export class SubDeclarationElement extends BaseProcedureElement<SubroutineDeclarationContext> {
	identifierCapability: IdentifierCapability;

	constructor(ctx: SubroutineDeclarationContext, doc: TextDocument) {
		super(ctx, doc, SymbolKind.Method);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.subroutineName()?.ambiguousIdentifier(),
			// For some reason the IdentifierCapability throws if no default is given
			// despite it not actually ever needing it. Most unusual.
			defaultRange: () => this.context.range
		});
		this.foldingRangeCapability.openWord = `Sub ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Sub';
		this.scopeItemCapability.type = ItemType.SUBROUTINE;
	}
}


export class FunctionDeclarationElement extends BaseProcedureElement<FunctionDeclarationContext> {
	identifierCapability: IdentifierCapability;

	constructor(ctx: FunctionDeclarationContext, doc: TextDocument) {
		super(ctx, doc, SymbolKind.Method);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.functionName()?.ambiguousIdentifier(),
		});
		this.foldingRangeCapability.openWord = `Function ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Function';
		this.scopeItemCapability.type = ItemType.FUNCTION;
	}
}


export class PropertyDeclarationElement {
	getters: PropertyGetDeclarationElement[] = [];
	setters: PropertySetDeclarationElement[] = [];
	letters: PropertyLetDeclarationElement[] = [];

	addPropertyDeclaration(property: PropertyGetDeclarationElement | PropertySetDeclarationElement | PropertyLetDeclarationElement) {
		if (property instanceof PropertyGetDeclarationElement) {
			this.getters.push(property);
		} else if (property instanceof PropertySetDeclarationElement) {
			this.setters.push(property);
		} else {
			this.letters.push(property);
		}
	}
}


/**
 * A base class for property Get, Set, Let types to inherit from.
 */
abstract class BasePropertyDeclarationElement<T extends ParserRuleContext & HasProcedureScope> extends BaseProcedureElement<T> {
	identifierCapability: IdentifierCapability;

	private propertyType: string;
	private nameContext?: AmbiguousIdentifierContext;

	get propertyName(): string { return `${this.identifierCapability.name.split(' ')[1]}`; }

	constructor(ctx: T, doc: TextDocument, propertyType: string, nameCtx?: AmbiguousIdentifierContext) {
		super(ctx, doc, SymbolKind.Property);
		this.nameContext = nameCtx;
		this.propertyType = propertyType;
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => this.nameContext,
			formatName: (x: string) => `${this.propertyType} ${x}`
		});
	}
}


export class PropertyGetDeclarationElement extends BasePropertyDeclarationElement<PropertyGetDeclarationContext> {
	constructor(ctx: PropertyGetDeclarationContext, doc: TextDocument) {
		super(ctx, doc, 'Get', ctx.functionName()?.ambiguousIdentifier() ?? undefined);
		this.foldingRangeCapability.openWord = `Get Property ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Property';
		this.scopeItemCapability.type = ItemType.PROPERTY;
		this.scopeItemCapability.assignmentType = AssignmentType.GET;
	}
}


export class PropertySetDeclarationElement extends BasePropertyDeclarationElement<PropertySetDeclarationContext> {
	constructor(ctx: PropertySetDeclarationContext, doc: TextDocument) {
		super(ctx, doc, 'Set', ctx.subroutineName()?.ambiguousIdentifier() ?? undefined);
		this.foldingRangeCapability.openWord = `Set Property ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Property';
		this.scopeItemCapability.type = ItemType.PROPERTY;
		this.scopeItemCapability.assignmentType = AssignmentType.SET;
	}
}


export class PropertyLetDeclarationElement extends BasePropertyDeclarationElement<PropertySetDeclarationContext> {
	constructor(ctx: PropertySetDeclarationContext, doc: TextDocument) {
		super(ctx, doc, 'Let', ctx.subroutineName()?.ambiguousIdentifier() ?? undefined);
		this.foldingRangeCapability.openWord = `Let Property ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Property';
		this.scopeItemCapability.type = ItemType.PROPERTY;
		this.scopeItemCapability.assignmentType = AssignmentType.LET;
	}
}