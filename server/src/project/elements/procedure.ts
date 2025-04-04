//Core
import { SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ParserRuleContext } from 'antlr4ng';
import {
	AmbiguousIdentifierContext,
	FunctionDeclarationContext,
	PropertyGetDeclarationContext,
	PropertySetDeclarationContext,
	SubroutineDeclarationContext
} from '../../antlr/out/vbaParser';

// Project
import { BaseContextSyntaxElement, HasDiagnosticCapability, HasSymbolInformationCapability } from './base';
import { DiagnosticCapability, FoldingRangeCapability, IdentifierCapability, SymbolInformationCapability } from '../../capabilities/capabilities';


abstract class BaseProcedureElement<T extends ParserRuleContext> extends BaseContextSyntaxElement<T> implements HasDiagnosticCapability, HasSymbolInformationCapability {
	diagnosticCapability: DiagnosticCapability;
	foldingRangeCapability: FoldingRangeCapability;
	symbolInformationCapability: SymbolInformationCapability;
	abstract identifierCapability: IdentifierCapability;

	constructor(ctx: T, doc: TextDocument, symbolKind: SymbolKind) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.symbolInformationCapability = new SymbolInformationCapability(this, symbolKind);
	}
}


export class SubDeclarationElement extends BaseProcedureElement<SubroutineDeclarationContext> {
	identifierCapability: IdentifierCapability;

	constructor(ctx: SubroutineDeclarationContext, doc: TextDocument) {
		super(ctx, doc, SymbolKind.Method);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.subroutineName()?.ambiguousIdentifier(),
		});
		this.foldingRangeCapability.openWord = `Sub ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Sub';

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
abstract class BasePropertyDeclarationElement<T extends ParserRuleContext> extends BaseProcedureElement<T> {
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
	}
}


export class PropertySetDeclarationElement extends BasePropertyDeclarationElement<PropertySetDeclarationContext> {
	constructor(ctx: PropertySetDeclarationContext, doc: TextDocument) {
		super(ctx, doc, 'Set', ctx.subroutineName()?.ambiguousIdentifier() ?? undefined);
		this.foldingRangeCapability.openWord = `Set Property ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Property';
	}
}


export class PropertyLetDeclarationElement extends BasePropertyDeclarationElement<PropertySetDeclarationContext> {
	constructor(ctx: PropertySetDeclarationContext, doc: TextDocument) {
		super(ctx, doc, 'Let', ctx.subroutineName()?.ambiguousIdentifier() ?? undefined);
		this.foldingRangeCapability.openWord = `Let Property ${this.identifierCapability.name}`;
		this.foldingRangeCapability.closeWord = 'End Property';
	}
}