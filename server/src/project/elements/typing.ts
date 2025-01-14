// Core
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SemanticTokenModifiers, SemanticTokenTypes, SymbolKind } from 'vscode-languageserver';

// Antlr
import { ParserRuleContext } from 'antlr4ng';
import { ConstItemContext,
	EnumDeclarationContext,
	GlobalVariableDeclarationContext,
	PrivateConstDeclarationContext,
	PrivateTypeDeclarationContext,
	PrivateVariableDeclarationContext,
	PublicConstDeclarationContext,
	PublicTypeDeclarationContext,
	PublicVariableDeclarationContext,
	TypeSuffixContext,
	VariableDclContext,
	WitheventsVariableDclContext
} from '../../antlr/out/vbaParser';

// Project
import { ElementOutOfPlaceDiagnostic, LegacyFunctionalityDiagnostic } from '../../capabilities/diagnostics';
import { BaseContextSyntaxElement, HasDiagnosticCapability, HasSemanticTokenCapability, HasSymbolInformationCapability } from './base';
import { DiagnosticCapability, IdentifierCapability, SemanticTokenCapability, SymbolInformationCapability } from '../../capabilities/capabilities';


abstract class BaseTypeDeclarationElement<T extends ParserRuleContext> extends BaseContextSyntaxElement<T> implements HasDiagnosticCapability, HasSymbolInformationCapability, HasSemanticTokenCapability {
	diagnosticCapability: DiagnosticCapability;
	abstract identifierCapability: IdentifierCapability;
	symbolInformationCapability: SymbolInformationCapability;
	semanticTokenCapability: SemanticTokenCapability;

	// ToDo: Implement callables.

	constructor(ctx: T, doc: TextDocument, symbolKind: SymbolKind, tokenType: SemanticTokenTypes, tokenModifiers?: SemanticTokenModifiers[]) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.symbolInformationCapability = new SymbolInformationCapability(this, symbolKind);
		this.semanticTokenCapability = new SemanticTokenCapability(this, tokenType, tokenModifiers ?? []);
	}
}


export class EnumDeclarationElement extends BaseTypeDeclarationElement<EnumDeclarationContext> {
	identifierCapability: IdentifierCapability;

	constructor(ctx: EnumDeclarationContext, doc: TextDocument, isAfterProcedure: boolean) {
		super(ctx, doc, SymbolKind.Enum, SemanticTokenTypes.enum);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.untypedName().ambiguousIdentifier()
		});
		if (isAfterProcedure) this.diagnosticCapability.diagnostics.push(
			new ElementOutOfPlaceDiagnostic(this.context.range, "Enum declaration")
		);
	}
}


export class TypeDeclarationElement extends BaseTypeDeclarationElement<PublicTypeDeclarationContext | PrivateTypeDeclarationContext> {
	identifierCapability: IdentifierCapability;

	private _isPublic: boolean
	get isPublic(): boolean { return this._isPublic; }

	constructor(ctx: PublicTypeDeclarationContext | PrivateTypeDeclarationContext, doc: TextDocument, isPublic: boolean) {
		super(ctx, doc, SymbolKind.Struct, SemanticTokenTypes.struct);
		this._isPublic = isPublic;
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.udtDeclaration().untypedName()
		});
		this.symbolInformationCapability = new SymbolInformationCapability(this, SymbolKind.Struct);
	}
}


type CombinedVariableContext =
	PublicVariableDeclarationContext
	| GlobalVariableDeclarationContext
	| PrivateVariableDeclarationContext
	| PublicConstDeclarationContext
	| PrivateConstDeclarationContext

export class DeclarationStatementElement<T extends CombinedVariableContext> extends BaseContextSyntaxElement<T> {
	private _isPublic: boolean;
	private isConstant: boolean;

	get isPublic(): boolean { return this._isPublic; }
	get declarations() {
		return this.context.rule.declarationContexts().map(x => new VariableDeclarationElement(
			x, this.context.document, this.isPublic, this.isConstant
		));
	}

	constructor(ctx: T, doc: TextDocument, isConstant: boolean, isPublic: boolean) {
		super(ctx, doc);
		this._isPublic = isPublic;
		this.isConstant = isConstant;
	}

	static create(ctx: CombinedVariableContext, doc: TextDocument) {
		const isPublicOrGlobal = (o: any): boolean => 'PUBLIC' in o || 'GLOBAL' in o;
		const isConstantContext = (o: any): o is PublicConstDeclarationContext | PrivateConstDeclarationContext => 'moduleConstDeclaration' in o;
		return new DeclarationStatementElement(ctx, doc, isConstantContext(ctx), isPublicOrGlobal(ctx));
	}
}


export class VariableDeclarationElement extends BaseContextSyntaxElement<VariableDclContext | WitheventsVariableDclContext | ConstItemContext> implements HasDiagnosticCapability, HasSymbolInformationCapability, HasSemanticTokenCapability {
	identifierCapability: IdentifierCapability;
	diagnosticCapability: DiagnosticCapability;
	symbolInformationCapability: SymbolInformationCapability;
	semanticTokenCapability: SemanticTokenCapability;

	private _isPublic: boolean;
	get isPublic(): boolean { return this._isPublic; }

	constructor(ctx: VariableDclContext | WitheventsVariableDclContext | ConstItemContext, doc: TextDocument, isPublic: boolean, isConst: boolean) {
		super(ctx, doc);
		this._isPublic = isPublic;
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.symbolInformationCapability = new SymbolInformationCapability(this, ctx.toSymbolKind());
		this.semanticTokenCapability = new SemanticTokenCapability(this, SemanticTokenTypes.variable, isConst ? [SemanticTokenModifiers.declaration, SemanticTokenModifiers.readonly] : [SemanticTokenModifiers.declaration]);
		this.identifierCapability = new IdentifierCapability({element: this, getNameContext: () => ctx.ambiguousIdentifier()});
	}
}


export class TypeSuffixElement extends BaseContextSyntaxElement<TypeSuffixContext> implements HasDiagnosticCapability, HasSemanticTokenCapability {
	diagnosticCapability: DiagnosticCapability;
	semanticTokenCapability: SemanticTokenCapability;

	constructor(ctx: TypeSuffixContext, doc: TextDocument) {
		super(ctx, doc);
		this.semanticTokenCapability = new SemanticTokenCapability(this, SemanticTokenTypes.class, []);
		this.diagnosticCapability = new DiagnosticCapability(this,
			() => this.evaluateDiagnostics()
		);
	}

	private evaluateDiagnostics = () => {
		// TODO: Make this diagnostic optional.
		this.diagnosticCapability.diagnostics.push(
			new LegacyFunctionalityDiagnostic(
				this.context.range,
				'Type hints'
			)
		);
		return this.diagnosticCapability.diagnostics;
	}
}