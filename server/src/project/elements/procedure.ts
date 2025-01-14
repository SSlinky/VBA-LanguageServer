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
import { DiagnosticCapability, IdentifierCapability, SymbolInformationCapability } from '../../capabilities/capabilities';


abstract class BaseProcedureElement<T extends ParserRuleContext> extends BaseContextSyntaxElement<T> implements HasDiagnosticCapability, HasSymbolInformationCapability {
	diagnosticCapability: DiagnosticCapability;
	abstract identifierCapability: IdentifierCapability;
	abstract symbolInformationCapability: SymbolInformationCapability;

	constructor(ctx: T, doc: TextDocument) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
	}
}


export class SubDeclarationElement extends BaseProcedureElement<SubroutineDeclarationContext> {
	identifierCapability: IdentifierCapability;
	symbolInformationCapability: SymbolInformationCapability;

	constructor(ctx: SubroutineDeclarationContext, doc: TextDocument) {
		super(ctx, doc);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.subroutineName()?.ambiguousIdentifier(),
		});
		this.symbolInformationCapability = new SymbolInformationCapability(this, SymbolKind.Method);
	}
}


export class FunctionDeclarationElement extends BaseProcedureElement<FunctionDeclarationContext> {
	identifierCapability: IdentifierCapability;
	symbolInformationCapability: SymbolInformationCapability;

	constructor(ctx: FunctionDeclarationContext, doc: TextDocument) {
		super(ctx, doc);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.functionName()?.ambiguousIdentifier(),
		});
		this.symbolInformationCapability = new SymbolInformationCapability(this, SymbolKind.Method);
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
	symbolInformationCapability: SymbolInformationCapability;

	private propertyType: string;
	private nameContext?: AmbiguousIdentifierContext;

	get propertyName(): string { return `${this.identifierCapability.name.split(' ')[1]}`; }

	constructor(ctx: T, doc: TextDocument, propertyType: string, nameCtx?: AmbiguousIdentifierContext) {
		super(ctx, doc);
		this.nameContext = nameCtx;
		this.propertyType = propertyType;
		this.symbolInformationCapability = new SymbolInformationCapability(this, SymbolKind.Property);
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
	}
}


export class PropertySetDeclarationElement extends BasePropertyDeclarationElement<PropertySetDeclarationContext> {
	constructor(ctx: PropertySetDeclarationContext, doc: TextDocument) {
		super(ctx, doc, 'Set', ctx.subroutineName()?.ambiguousIdentifier() ?? undefined);
	}
}


export class PropertyLetDeclarationElement extends BasePropertyDeclarationElement<PropertySetDeclarationContext> {
	constructor(ctx: PropertySetDeclarationContext, doc: TextDocument) {
		super(ctx, doc, 'Let', ctx.subroutineName()?.ambiguousIdentifier() ?? undefined);
	}
}