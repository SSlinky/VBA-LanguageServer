// Core
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SemanticTokenModifiers, SemanticTokenTypes, SymbolKind } from 'vscode-languageserver';

// Antlr
import { ParserRuleContext } from 'antlr4ng';
import {
	ArrayDimContext,
	AsClauseContext,
	ConstDeclarationContext,
	ConstItemContext,
	EnumDeclarationContext,
	EnumMemberContext,
	PublicEnumDeclarationContext,
	PublicTypeDeclarationContext,
	TypeSuffixContext,
	UdtDeclarationContext,
	UnrestrictedNameContext,
	VariableDclContext,
	VariableDeclarationContext,
	WitheventsVariableDclContext
} from '../../antlr/out/vbaParser';

// Project
import { ElementOutOfPlaceDiagnostic, LegacyFunctionalityDiagnostic } from '../../capabilities/diagnostics';
import { BaseContextSyntaxElement, HasDiagnosticCapability, HasSemanticTokenCapability, HasSymbolInformationCapability } from './base';
import { AssignmentType, DiagnosticCapability, IdentifierCapability, ItemType, ScopeItemCapability, SemanticTokenCapability, SymbolInformationCapability } from '../../capabilities/capabilities';


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

		// An enum is public unless explicitly set to private.
		this.scopeItemCapability = new ScopeItemCapability(this, ItemType.TYPE);
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
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.untypedName().ambiguousIdentifier()
		});
		if (isAfterProcedure) this.diagnosticCapability.diagnostics.push(
			new ElementOutOfPlaceDiagnostic(this.context.range, "Enum declaration")
		);

		// ToDo:
		// diagnosticCapability.evaluate() should check for explicitly numbered members
		// evaluating to the same value.
	}
}

export class EnumMemberDeclarationElement extends BaseContextSyntaxElement<EnumMemberContext> {
	identifierCapability: IdentifierCapability;

	constructor(ctx: EnumMemberContext, doc: TextDocument) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.untypedName()
		});
		this.scopeItemCapability = new ScopeItemCapability(this, ItemType.VARIABLE, AssignmentType.GET);
	}
}


export class TypeDeclarationElement extends BaseTypeDeclarationElement<UdtDeclarationContext> {
	identifierCapability: IdentifierCapability;

	protected override get isPublicScope(): boolean {
		return this.context.rule.parent instanceof PublicTypeDeclarationContext;
	}

	constructor(ctx: UdtDeclarationContext, doc: TextDocument) {
		super(ctx, doc, SymbolKind.Struct, SemanticTokenTypes.struct);
		this.identifierCapability = new IdentifierCapability({
			element: this,
			getNameContext: () => ctx.untypedName()
		});
	}
}


// ToDo: When events are implemented, note that you cannot raise an event in the
// 		 constructor. It's legal but won't do anything since handlers aren't
// 		 attached until the object is constructed.
//		 Also note that an event _can only be public_. 

export class VariableDeclarationStatementElement extends BaseContextSyntaxElement<VariableDeclarationContext> {

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
		this.scopeItemCapability = new ScopeItemCapability(this, ItemType.VARIABLE);
	}
}

export class ConstDeclarationStatementElement extends BaseContextSyntaxElement<ConstDeclarationContext> {

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
		this.scopeItemCapability = new ScopeItemCapability(this, ItemType.VARIABLE);
	}
}


export class VariableDeclarationElement extends BaseContextSyntaxElement<VariableDclContext | WitheventsVariableDclContext | ConstItemContext> implements HasDiagnosticCapability, HasSymbolInformationCapability { //, HasSemanticTokenCapability {
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
		this.identifierCapability = new IdentifierCapability({ element: this, getNameContext: () => ctx.ambiguousIdentifier() });
		
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
		this.scopeItemCapability = new ScopeItemCapability(this, ItemType.VARIABLE);
		this.scopeItemCapability.assignmentType = AssignmentType.GET
			| (this.hasLetAccessor ? AssignmentType.LET : AssignmentType.NONE)
			| (this.hasSetAccessor ? AssignmentType.SET : AssignmentType.NONE);
	}

	get hasLetAccessor(): boolean {
		if (this.context.rule instanceof WitheventsVariableDclContext) {
			return false;
		}
		if (this.context.rule instanceof ConstItemContext) {
			return false;
		}
		return this.variableTypeInformation?.isPrimativeType ?? true;
	}

	get hasSetAccessor(): boolean {
		if (this.context.rule instanceof WitheventsVariableDclContext) {
			return true;
		}
		if (this.context.rule instanceof ConstItemContext) {
			return false;
		}
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

// ToDo: Needs to handle ClassTypeNameContext
class VariableTypeInformation extends BaseContextSyntaxElement<TypeSuffixContext | AsClauseContext> {
	get isObjectType(): boolean {
		// Type hints are never an object.
		const ctx = this.context.rule;
		if (ctx instanceof TypeSuffixContext) {
			return false;
		}

		// Check builtins for variant type.
		const builtin = ctx.asType()?.typeSpec().typeExpression()?.builtinType();
		if (builtin?.reservedTypeIdentifier()?.VARIANT() || builtin?.reservedTypeIdentifierB()?.VARIANT_B()) {
			return true;
		}

		// Don't trust anything else. Just check not a primative.
		return !this.isPrimativeType;
	}

	get isPrimativeType(): boolean {
		// Type hints are always primitive.
		const ctx = this.context.rule;
		if (ctx instanceof TypeSuffixContext) {
			return true;
		}

		// A newed object is always an object.
		if (ctx.asAutoObject()) {
			return false;
		}

		// Fixed length strings are primative.
		const typeSpec = ctx.asType()!.typeSpec();
		if (typeSpec.fixedLengthStringSpec()) {
			return true;
		}

		// Built ins are primative (or can be in Variant's case) unless object.
		const builtin = typeSpec.typeExpression()?.builtinType();
		if (builtin?.reservedTypeIdentifier() || builtin?.reservedTypeIdentifierB()) {
			return true;
		} else if (builtin?.OBJECT() || builtin?.OBJECT_B()) {
			return false;
		}

		// Defined names can be all sorts of things but if we got here, we're an object.
		const definedType = typeSpec.typeExpression()?.definedTypeExpression();
		if (definedType?.simpleNameExpression()) {
			return false;
		}

		// If we have a member accessed type, we need to do more digging...
		const memberAccessed = definedType?.memberAccessExpression()?.unrestrictedName();
		const isPrimativeMember = (ctx: UnrestrictedNameContext | undefined): boolean => !!memberAccessed?.reservedIdentifier()?.reservedTypeIdentifier();
		const isTypeSuffixMember = (ctx: UnrestrictedNameContext | undefined): boolean => !!memberAccessed?.name()?.typedName();
		return isPrimativeMember(memberAccessed) || isTypeSuffixMember(memberAccessed);
	}

	get isFixedArrayType(): boolean {
		return !this.arrayCtx?.boundsList();
	}

	constructor(ctx: TypeSuffixContext | AsClauseContext, doc: TextDocument, private readonly arrayCtx?: ArrayDimContext) {
			super(ctx, doc);
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
	};
}