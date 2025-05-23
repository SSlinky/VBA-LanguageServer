// Core
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolKind } from 'vscode-languageserver';

// Antlr
import { ParserRuleContext } from 'antlr4ng';
import {
	ArrayDesignatorContext,
	ArrayDimContext,
	AsClauseContext,
	ConstDeclarationContext,
	ConstItemContext,
	EnumDeclarationContext,
	EnumMemberContext,
	PositionalParamContext,
	PublicEnumDeclarationContext,
	PublicTypeDeclarationContext,
	TypeExpressionContext,
	TypeSuffixContext,
	UdtDeclarationContext,
	UnrestrictedNameContext,
	VariableDclContext,
	VariableDeclarationContext,
	WitheventsVariableDclContext
} from '../../antlr/out/vbaParser';

// Project
import { ElementOutOfPlaceDiagnostic, LegacyFunctionalityDiagnostic, UnusedDiagnostic } from '../../capabilities/diagnostics';
import { BaseRuleSyntaxElement, HasDiagnosticCapability, HasSemanticTokenCapability, HasSymbolInformationCapability } from './base';
import { AssignmentType, DiagnosticCapability, IdentifierCapability, ScopeType, ScopeItemCapability, SemanticTokenCapability, SymbolInformationCapability } from '../../capabilities/capabilities';
import { SemanticTokenModifiers, SemanticTokenTypes } from '../../capabilities/semanticTokens';


abstract class BaseTypeDeclarationElement<T extends ParserRuleContext> extends BaseRuleSyntaxElement<T> implements HasDiagnosticCapability, HasSymbolInformationCapability, HasSemanticTokenCapability {
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

		// An enum is public unless explicitly set to private.
		this.scopeItemCapability = new ScopeItemCapability(this, ScopeType.TYPE);
		this.scopeItemCapability.isPublicScope = this.isPublicScope;
	}

	protected get isPublicScope(): boolean {
		throw new Error('Not implemented');
	}
}


export class EnumDeclarationElement extends BaseTypeDeclarationElement<EnumDeclarationContext> {
	identifierCapability: IdentifierCapability;

	protected override get isPublicScope(): boolean {
		return this.context.rule.parent instanceof PublicEnumDeclarationContext;
	}

	constructor(ctx: EnumDeclarationContext, doc: TextDocument, isAfterProcedure: boolean) {
		super(ctx, doc, SymbolKind.Enum, SemanticTokenTypes.enum);

		const getIdentifierNameContext = () => ctx.untypedName().ambiguousIdentifier();
		this.identifierCapability = new IdentifierCapability(this, getIdentifierNameContext);
		if (isAfterProcedure) this.diagnosticCapability.diagnostics.push(
			new ElementOutOfPlaceDiagnostic(this.context.range, "Enum declaration")
		);

		// ToDo:
		// diagnosticCapability.evaluate() should check for explicitly numbered members
		// evaluating to the same value.
	}
}

export class EnumMemberDeclarationElement extends BaseRuleSyntaxElement<EnumMemberContext> {
	identifierCapability: IdentifierCapability;

	constructor(ctx: EnumMemberContext, doc: TextDocument) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		const getIdentifierNameContext = () => ctx.untypedName();
		this.identifierCapability = new IdentifierCapability(this, getIdentifierNameContext);
		this.scopeItemCapability = new ScopeItemCapability(this, ScopeType.VARIABLE, AssignmentType.GET);
	}
}


export class TypeDeclarationElement extends BaseTypeDeclarationElement<UdtDeclarationContext> {
	identifierCapability: IdentifierCapability;

	protected override get isPublicScope(): boolean {
		return this.context.rule.parent instanceof PublicTypeDeclarationContext;
	}

	constructor(ctx: UdtDeclarationContext, doc: TextDocument) {
		super(ctx, doc, SymbolKind.Struct, SemanticTokenTypes.struct);
		const getIdentifierNameContext = () => ctx.untypedName();
		this.identifierCapability = new IdentifierCapability(this, getIdentifierNameContext);
	}
}


// ToDo: When events are implemented, note that you cannot raise an event in the
// 		 constructor. It's legal but won't do anything since handlers aren't
// 		 attached until the object is constructed.
//		 Also note that an event _can only be public_. 

export class VariableDeclarationStatementElement extends BaseRuleSyntaxElement<VariableDeclarationContext> {

	get isPublic(): boolean {
		const modifierCtx = this.context.rule.variableModifier();
		return !!modifierCtx?.GLOBAL() || !!modifierCtx?.PUBLIC();
	}

	get declarations() {
		const doc = this.context.document;
		const declarationList = this.context.rule.variableDeclarationList()
			?? this.context.rule.moduleVariableDeclarationList()!;

		return declarationList.variableDcl().map(ctx => new VariableDeclarationElement(ctx, doc, this.isPublic, false));
	}

	constructor(ctx: VariableDeclarationContext, doc: TextDocument) {
		super(ctx, doc);
		this.scopeItemCapability = new ScopeItemCapability(this, ScopeType.VARIABLE);
	}
}

export class ConstDeclarationStatementElement extends BaseRuleSyntaxElement<ConstDeclarationContext> {

	get isPublic(): boolean {
		const modifierCtx = this.context.rule.variableModifier();
		return !!modifierCtx?.GLOBAL() || !!modifierCtx?.PUBLIC();
	}

	get declarations() {
		const doc = this.context.document;
		const declarationList = this.context.rule.constItemList().constItem();
		return declarationList.map(ctx => new VariableDeclarationElement(ctx, doc, this.isPublic, true));
	}

	constructor(ctx: ConstDeclarationContext, doc: TextDocument) {
		super(ctx, doc);
		this.scopeItemCapability = new ScopeItemCapability(this, ScopeType.VARIABLE);
	}
}


export class VariableDeclarationElement extends BaseRuleSyntaxElement<VariableDclContext | WitheventsVariableDclContext | ConstItemContext> implements HasDiagnosticCapability, HasSymbolInformationCapability { //, HasSemanticTokenCapability {
	identifierCapability: IdentifierCapability;
	diagnosticCapability: DiagnosticCapability;
	symbolInformationCapability: SymbolInformationCapability;
	// semanticTokenCapability: SemanticTokenCapability;

	private variableTypeInformation?: VariableTypeInformation;

	constructor(ctx: VariableDclContext | WitheventsVariableDclContext | ConstItemContext, doc: TextDocument, readonly isPublic: boolean, readonly isConstant: boolean) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.symbolInformationCapability = new SymbolInformationCapability(this, ctx.toSymbolKind());
		// this.semanticTokenCapability = new SemanticTokenCapability(this, SemanticTokenTypes.variable, isConst ? [SemanticTokenModifiers.declaration, SemanticTokenModifiers.readonly] : [SemanticTokenModifiers.declaration]);
		this.identifierCapability = new IdentifierCapability(this, () => ctx.ambiguousIdentifier());

		// VariableDcl > TypedVariableDcl > TypedName > TypeSuffix
		//			   > UntypedVariableDcl > AsClause

		// Always going to be an object.
		// WithEventsVariable > classTypeName > definedTypeExpression > simple/member

		// Always going to be a primative.
		// ConstItemContext > TypeSuffix
		// ConstItemContext > constAsClause > builtInType
		if (ctx instanceof VariableDclContext) {
			const typeCtx = ctx.typedVariableDcl()?.typedName().typeSuffix()
				?? ctx.untypedVariableDcl()?.asClause();
			const arrayCtx = ctx.typedVariableDcl()?.arrayDim()
				?? ctx.untypedVariableDcl()?.arrayClause()?.arrayDim();
			if (typeCtx) {
				this.variableTypeInformation = new VariableTypeInformation(typeCtx, doc, arrayCtx);
			}
		}
		this.scopeItemCapability = new ScopeItemCapability(this, ScopeType.VARIABLE);
		this.scopeItemCapability.assignmentType = AssignmentType.GET
			| (this.hasLetAccessor ? AssignmentType.LET : AssignmentType.NONE)
			| (this.hasSetAccessor ? AssignmentType.SET : AssignmentType.NONE);
	}

	get hasLetAccessor(): boolean {
		return this.variableTypeInformation?.isPrimativeType ?? true;
	}

	get hasSetAccessor(): boolean {
		return this.variableTypeInformation?.isObjectType ?? true;
	}

	getType() {
		const ctx = this.context.rule;
		if (ctx instanceof VariableDclContext) {
			// If we're null here, we're implicitly a variant.
			const typeCtx = ctx.typedVariableDcl()?.typedName().typeSuffix()
				?? ctx.untypedVariableDcl()!.asClause();

		}
	}
}


type TypeContext = TypeSuffixContext
	| AsClauseContext
	| TypeExpressionContext;

// ToDo: Needs to handle ClassTypeNameContext
class VariableTypeInformation extends BaseRuleSyntaxElement<TypeContext> {
	get isObjectType(): boolean {
		return this.context.rule.isObject;
	}

	get isPrimativeType(): boolean {
		return this.context.rule.isPrimative;
	}

	get isVariantType(): boolean {
		return this.context.rule.isVariant;
	}

	// TODO:
	// 	- Variables in array bounds should validate they are constants or literals.
	// 	- Build the capability to evaluate constant expressions.
	get isResizable(): boolean {
		return this.arrayCtx?.isResizable ?? false;
	}

	constructor(ctx: TypeContext, doc: TextDocument, private readonly arrayCtx?: ArrayDimContext | ArrayDesignatorContext) {
		super(ctx, doc);
	}
}

export class PositionalParamElement extends BaseRuleSyntaxElement<PositionalParamContext> {
	identifierCapability: IdentifierCapability;
	diagnosticCapability: DiagnosticCapability;

	private variableTypeInformation?: VariableTypeInformation;

	constructor(ctx: PositionalParamContext, doc: TextDocument) {
		super(ctx, doc);

		const typeCtx = ctx.paramDcl().untypedNameParamDcl()?.parameterType()?.typeExpression()
			?? ctx.paramDcl().typedNameParamDcl()?.typedName().typeSuffix();

		const arrayCtx = ctx.paramDcl().untypedNameParamDcl()?.parameterType()?.arrayDesignator()
			?? ctx.paramDcl().typedNameParamDcl()?.arrayDesignator()
			?? undefined;

		if (typeCtx) {
			this.variableTypeInformation = new VariableTypeInformation(typeCtx, doc, arrayCtx);
		}

		const identifierCtx = ctx.paramDcl().untypedNameParamDcl()?.ambiguousIdentifier()
			?? ctx.paramDcl().typedNameParamDcl()?.typedName().ambiguousIdentifier();
		this.identifierCapability = new IdentifierCapability(this, () => identifierCtx);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.scopeItemCapability = new ScopeItemCapability(this, ScopeType.PARAMETER,);
		this.scopeItemCapability.assignmentType = AssignmentType.GET
			| (this.hasLetAccessor ? AssignmentType.LET : AssignmentType.NONE)
			| (this.hasSetAccessor ? AssignmentType.SET : AssignmentType.NONE);
	}

	get hasLetAccessor(): boolean {
		return this.variableTypeInformation?.isPrimativeType ?? true;
	}

	get hasSetAccessor(): boolean {
		return this.variableTypeInformation?.isObjectType ?? true;
	}
}


export class TypeSuffixElement extends BaseRuleSyntaxElement<TypeSuffixContext> implements HasDiagnosticCapability, HasSemanticTokenCapability {
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
	};
}