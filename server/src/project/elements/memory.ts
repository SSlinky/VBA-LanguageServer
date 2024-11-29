import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, SemanticTokenModifiers, SemanticTokenTypes, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { AmbiguousIdentifierContext, ConstItemContext, EnumDeclarationContext, EnumMemberContext, FunctionDeclarationContext, ProcedureDeclarationContext, PropertyGetDeclarationContext, PropertySetDeclarationContext, PublicConstDeclarationContext, ReservedMemberNameContext, SubroutineDeclarationContext, UdtDeclarationContext, UdtElementContext, UntypedNameContext, VariableDclContext } from '../../antlr/out/vbaParser';

import { BaseContextSyntaxElement, DeclarationElement, HasDiagnosticCapability, HasNamedSemanticToken, HasSymbolInformation, IdentifiableSyntaxElement, NamedSyntaxElement } from './base';

import { VbaClassDocument, VbaModuleDocument } from '../document';
import { SymbolInformationFactory } from '../../capabilities/symbolInformation';
import '../../extensions/parserExtensions';
import { DuplicateDeclarationDiagnostic, ElementOutOfPlaceDiagnostic } from '../../capabilities/diagnostics';
import { ScopeElement } from './special';
import { ParserRuleContext } from 'antlr4ng';



export class IdentifierElement extends BaseContextSyntaxElement {
	constructor(ctx: UntypedNameContext | ConstItemContext | AmbiguousIdentifierContext | ReservedMemberNameContext, doc: TextDocument) {
		super(ctx, doc);
	}
}

export abstract class ProcedureDeclarationElement extends ScopeElement {
	abstract diagnostics: Diagnostic[];
	abstract identifier: IdentifierElement;

	constructor(context: ProcedureDeclarationContext, document: TextDocument) {
		super(context, document);
	}

	evaluateDiagnostics(): Diagnostic[] {
		return [];
	}

	get name(): string {
		return this.identifier.text;
	}

	static create(context: ProcedureDeclarationContext, document: VbaClassDocument | VbaModuleDocument) {
		let methodContext: SubroutineDeclarationContext | FunctionDeclarationContext | PropertyGetDeclarationContext | null;

		// Create a sub if we have one.
		methodContext = context.subroutineDeclaration();
		if (methodContext) {
			return new SubDeclarationElement(context, document.textDocument, methodContext);
		}

		// Create a function if we have one.
		methodContext = context.functionDeclaration();
		if (methodContext) {
			return new FunctionDeclarationElement(context, document.textDocument, methodContext);
		}

		// Check if we already have a property with this name.
		const propertyDeclaration = new PropertyDeclarationElement(context, document.textDocument);
		const identifierText = propertyDeclaration.identifier.text;
		// const predeclaredElements = document.currentScopeElement?.declaredNames.get(identifierText) ?? [];

		// Add to an existing property rather than creating.
		// for (const element of predeclaredElements) {
		// 	if (element.isPropertyElement() && element.identifier.text === identifierText) {
		// 		element.addPropertyDeclaration(context, document.textDocument);
		// 		return element;
		// 	}
		// }

		// Return a new property.
		return propertyDeclaration;
	}
}

export class SubDeclarationElement extends ProcedureDeclarationElement implements DeclarationElement, HasSymbolInformation {
	identifier: IdentifierElement;
	symbolInformation: SymbolInformation;
	diagnostics: Diagnostic[] = [];

	constructor(context: ProcedureDeclarationContext, document: TextDocument, methodContext: SubroutineDeclarationContext) {
		super(context, document);

		const identifierContext = methodContext.subroutineName()?.ambiguousIdentifier();
		this.identifier = new IdentifierElement(identifierContext!, document);
		this.symbolInformation = SymbolInformation.create(
			this.identifier.text,
			SymbolKind.Method,
			this.range,
			this.document.uri
		);
	}
}

export class FunctionDeclarationElement extends ProcedureDeclarationElement implements DeclarationElement, HasSymbolInformation {
	identifier: IdentifierElement;
	symbolInformation: SymbolInformation;
	diagnostics: Diagnostic[] = [];

	constructor(context: ProcedureDeclarationContext, document: TextDocument, methodContext: FunctionDeclarationContext) {
		super(context, document);
		const identifierContext = methodContext.functionName()!.ambiguousIdentifier()!;
		this.identifier = new IdentifierElement(identifierContext, document);
		this.symbolInformation = SymbolInformation.create(
			this.identifier.text,
			SymbolKind.Method,
			this.range,
			this.document.uri
		);
	}
}

export class PropertyDeclarationElement extends ProcedureDeclarationElement implements HasSymbolInformation {
	identifier: IdentifierElement;
	diagnostics: Diagnostic[] = [];
	symbolInformation: SymbolInformation;
	getDeclarations: PropertyGetDeclarationElement[] = [];
	letDeclarations: PropertyLetDeclarationElement[] = [];
	setDeclarations: PropertyLetDeclarationElement[] = [];

	get countDeclarations(): number {
		return this.getDeclarations.length
			+ this.letDeclarations.length
			+ this.setDeclarations.length;
	}

	constructor(context: ProcedureDeclarationContext, document: TextDocument) {
		super(context, document);
		const identifier = this.addPropertyDeclaration(context, document);
		this.identifier = identifier.value
		this.symbolInformation = SymbolInformation.create(
			`${identifier.type} ${this.identifier.text}`,
			SymbolKind.Property,
			this.range,
			this.document.uri
		);
	}

	evaluateDiagnostics() {
		this._evaluateDuplicateDeclarationsDiagnostics();
		return this.diagnostics;
	}

	addPropertyDeclaration(context: ProcedureDeclarationContext, document: TextDocument) {
		let property: PropertyGetDeclarationElement | PropertyLetDeclarationElement | PropertySetDeclarationElement;
		let propertyType: string;
		switch (true) {
			case !!context.propertyGetDeclaration():
				propertyType = 'Get';
				property = new PropertyGetDeclarationElement(context, document, context.propertyGetDeclaration()!);
				this.getDeclarations.push(new PropertyGetDeclarationElement(context, document, context.propertyGetDeclaration()!));
				break;
			case !!context.propertySetDeclaration()?.LET():
				propertyType = 'Let';
				property = new PropertyLetDeclarationElement(context, document, context.propertySetDeclaration()!);
				this.letDeclarations.push(property);
				break;
			default:
				propertyType = 'Set';
				property = new PropertyLetDeclarationElement(context, document, context.propertySetDeclaration()!);
				this.setDeclarations.push(new PropertySetDeclarationElement(context, document, context.propertySetDeclaration()!));
				break;
		}
		return { type: propertyType, value: property.identifier };
	}

	private _evaluateDuplicateDeclarationsDiagnostics(): void {
		[this.getDeclarations, this.letDeclarations, this.setDeclarations].forEach(declarations => {
			declarations.forEach((declaration, i) => {
				if (i > 0) this.diagnostics.push(new DuplicateDeclarationDiagnostic(declaration.identifier.range));
			});
		});
	}
}

class PropertyGetDeclarationElement extends ProcedureDeclarationElement {
	identifier: IdentifierElement;
	diagnostics: Diagnostic[] = [];

	constructor(context: ProcedureDeclarationContext, document: TextDocument, getContext: PropertyGetDeclarationContext) {
		super(context, document);
		this.identifier = new IdentifierElement(getContext.functionName()!.ambiguousIdentifier()!, document);
	}
}

class PropertyLetDeclarationElement extends ProcedureDeclarationElement {
	identifier: IdentifierElement;
	diagnostics: Diagnostic[] = [];

	constructor(context: ProcedureDeclarationContext, document: TextDocument, setContext: PropertySetDeclarationContext) {
		super(context, document);
		this.identifier = new IdentifierElement(setContext.subroutineName()!.ambiguousIdentifier()!, document);
	}
}

class PropertySetDeclarationElement extends ProcedureDeclarationElement {
	identifier: IdentifierElement;
	diagnostics: Diagnostic[] = [];

	constructor(context: ProcedureDeclarationContext, document: TextDocument, setContext: PropertySetDeclarationContext) {
		super(context, document);
		this.identifier = new IdentifierElement(setContext.subroutineName()!.ambiguousIdentifier()!, document);
	}
}

abstract class BaseEnumDeclarationElement extends ScopeElement implements HasNamedSemanticToken, HasSymbolInformation, NamedSyntaxElement, IdentifiableSyntaxElement {
	identifier: IdentifierElement;
	tokenModifiers: SemanticTokenModifiers[] = [];
	declaredNames: Map<string, EnumMemberDeclarationElement[]> = new Map();

	abstract tokenType: SemanticTokenTypes;
	abstract symbolInformation: SymbolInformation;

	get name(): string {
		return this.identifier.text;
	}

	constructor(context: EnumDeclarationContext | EnumMemberContext, document: TextDocument) {
		super(context, document);
		this.identifier = new IdentifierElement(context.untypedName().ambiguousIdentifier()!, document);
	}
}

export class EnumDeclarationElement extends BaseEnumDeclarationElement implements HasDiagnosticCapability {
	// scope: Scope;
	diagnostics: Diagnostic[] = [];
	tokenType: SemanticTokenTypes;
	isDeclaredAfterMethod: boolean;
	enumMembers: EnumMemberDeclarationElement[];

	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, SymbolKind.Enum
		);
	}

	constructor(context: EnumDeclarationContext, document: TextDocument, isDeclaredAfterMethod: boolean) {
		super(context, document);
		// this.scope = scope;
		this.tokenType = SemanticTokenTypes.enum;
		this.isDeclaredAfterMethod = isDeclaredAfterMethod;
		this.identifier = new IdentifierElement(context.untypedName().ambiguousIdentifier()!, document);
		this.enumMembers = context.enumMemberList().enumElement().map(e => {
			const member = e.enumMember()!;
			return new EnumMemberDeclarationElement(member, document);
		} )
	}

	evaluateDiagnostics() {
		if (this.isDeclaredAfterMethod) {
			this.diagnostics.push(new ElementOutOfPlaceDiagnostic(this.range, 'Enum declaration'));
		}
		return this.diagnostics
	}
}

class EnumMemberDeclarationElement extends BaseEnumDeclarationElement {
	tokenType: SemanticTokenTypes;

	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, SymbolKind.EnumMember
		);
	}

	constructor(context: EnumMemberContext, document: TextDocument) {
		super(context, document);
		this.tokenType = SemanticTokenTypes.enumMember;
		this.identifier = new IdentifierElement(context.untypedName().ambiguousIdentifier()!, document);
	}

	evaluateDiagnostics(): Diagnostic[] {
		return this.diagnostics
	}
}

abstract class BaseVariableDeclarationStatementElement extends BaseContextSyntaxElement implements DeclarationElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];
	diagnostics: Diagnostic[] = [];
	readonly symbolKind: SymbolKind;
	abstract isPublic: boolean;
	abstract identifier: IdentifierElement;

	get name(): string {
		return this.identifier.text;
	}

	get symbolInformation(): SymbolInformation {
		return SymbolInformation.create(
			this.identifier.text,
			this.symbolKind,
			this.range,
			this.document.uri
		);
	}

	constructor(context: VariableDclContext | ConstItemContext | UdtElementContext, document: TextDocument, tokenType: SemanticTokenTypes, symbolKind: SymbolKind) {
		super(context, document);
		this.tokenType = tokenType;
		this.symbolKind = symbolKind;
	}

	// Empty method so that implementation is optional.
	evaluateDiagnostics(): Diagnostic[] {
		return [];
	}

	isPropertyElement(): this is PropertyDeclarationElement {
		return false;
	}
}

export class ConstDeclarationElement extends BaseVariableDeclarationStatementElement {
	identifier: IdentifierElement;
	isPublic: boolean;

	constructor(context: ConstItemContext, document: TextDocument) {
		super(context, document, SemanticTokenTypes.variable, SymbolKind.Constant);
		const identifierContext = ConstDeclarationElement._getIdentifierContext(context);
		this.identifier = new IdentifierElement(identifierContext, document);

		// Public/Global and private are at module level.
		// Local cannot have a modifier, i.e., they are private.
		//  publicConstDeclaration -> moduleConstDeclaration -> constDeclaration -> constItemList -> constItem
		// privateConstDeclaration -> moduleConstDeclaration -> constDeclaration -> constItemList -> constItem
		// 							   localConstDeclaration -> constDeclaration -> constItemList -> constItem
		const constDeclaration = context.parent!.parent!.parent!.parent!;
		if(this._isPublicConst(constDeclaration)) {
			// TODO: Add logic to get module option private module when no modifiers present.
			//		 *Assuming module level declaration (add this to variable and method too).
			this.isPublic = !!constDeclaration.GLOBAL() || !!constDeclaration.PUBLIC();
		} else {
			this.isPublic = false;
		}
	}

	// We're always going to have a context here, and if we don't, we'd want it to break anyway.
	private static _getIdentifierContext(context: ConstItemContext): AmbiguousIdentifierContext {
		const name = context.typedNameConstItem()?.typedName().ambiguousIdentifier()
			?? context.untypedNameConstItem()?.ambiguousIdentifier();
		return name!;
	}

	private _isPublicConst(ctx: ParserRuleContext): ctx is PublicConstDeclarationContext {
		return 'PUBLIC' in ctx;
	}

	// private _isPrivateConst(ctx: ParserRuleContext): ctx is PrivateConstDeclarationContext {
	// 	return 'PRIVATE' in ctx;
	// }
}

export class TypeDeclarationElement  extends ScopeElement implements HasNamedSemanticToken, HasSymbolInformation, NamedSyntaxElement, IdentifiableSyntaxElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];
	identifier: IdentifierElement;
	symbolKind: SymbolKind;
	declaredNames: Map<string, TypeMemberDeclarationElement[]> = new Map();

	constructor(context: UdtDeclarationContext, document: TextDocument) {
		super(context, document);
		this.symbolKind = SymbolKind.Struct;
		this.tokenType = SemanticTokenTypes.struct;
		this.identifier = new IdentifierElement(context.untypedName(), document);
		context.udtMemberList().udtElement().forEach(member =>
			this.pushDeclaredName(new TypeMemberDeclarationElement(member, document))
		);
	}

	get name(): string { return this.identifier.text; }
	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this as NamedSyntaxElement, this.symbolKind
		);
	}

	pushDeclaredName(e: TypeMemberDeclarationElement) {
		if (!this.declaredNames.has(e.identifier.text)) {
			this.declaredNames.set(e.identifier.text, [e]);
		} else {
			this.declaredNames.get(e.identifier.text)?.push(e);
		}
	}
	
	evaluateDiagnostics(): Diagnostic[] {
		return [];
	}
}

export class TypeMemberDeclarationElement extends BaseVariableDeclarationStatementElement {
	isPublic = false; // temp fix for implementation - TODO: don't inherit base variable.
	identifier: IdentifierElement;
	
	get name(): string {
		return this.identifier.text;
	}

	constructor(context: UdtElementContext, document: TextDocument) {
		super(context, document, SemanticTokenTypes.property, SymbolKind.Property);
		const identifierContext = context.udtMember()?.untypedNameMemberDcl()?.ambiguousIdentifier() ?? context.udtMember()?.reservedNameMemberDcl()?.reservedMemberName();
		this.identifier = new IdentifierElement(identifierContext!, document);
	}
}

// export class VariableDeclarationsElement extends BaseVariableDeclarationStatementElement {
// 	declarations: VariableDeclarationElement[] = [];

// 	constructor(context: VariableStmtContext, document: TextDocument) {
// 		super(context, document);
// 		context.variableListStmt().variableSubStmt().forEach((element) =>
// 			this.declarations.push(new VariableDeclarationElement(
// 				element, document
// 			))
// 		);
// 	}
// }

// class VariableDeclarationElement extends BaseContextSyntaxElement implements HasSymbolInformation {
// 	identifier: IdentifierElement;
// 	asType: VariableType;
// 	arrayBounds?: ArrayBounds;

// 	constructor(context: ConstSubStmtContext | VariableSubStmtContext, document: TextDocument) {
// 		super(context, document);
// 		this.asType = new VariableType(context.asTypeClause(), document);
// 		this.arrayBounds = ArrayBounds.create(context);
// 		this.identifier = new IdentifierElement(context.ambiguousIdentifier(), document);
// 	}

// 	get name(): string { return this.identifier.text; }
// 	get symbolInformation(): SymbolInformation {
// 		return SymbolInformationFactory.create(
// 			this, this.asType.symbolKind
// 		);
// 	}
// }

// class VariableType extends BaseSyntaxElement {
// 	typeName: string;
// 	symbolKind: SymbolKind;

// 	constructor(context: AsTypeClauseContext | undefined, document: TextDocument, isArray?: boolean) {
// 		super(context, document);
// 		this.symbolKind = isArray ? SymbolKind.Array : SymbolKind.Variable;

// 		// Needs more ternery.
// 		const type = context?.type_()?.baseType() ?? context?.type_()?.complexType();
// 		this.typeName = type?.text ?? type?.text ?? 'Variant';
// 		this.symbolKind = type ? type.toSymbolKind() : SymbolKind.Variable;
// 	}
// }

// class ArrayBounds {
// 	dimensions: { lower: number, upper: number }[] = [];

// 	constructor(subStmt: VariableSubStmtContext) {
// 		subStmt.subscripts()?.subscript_().forEach((x) => {
// 			const vals = x.valueStmt();
// 			this.dimensions.push({
// 				lower: vals.length === 1 ? 0 : +vals[0].text,
// 				upper: vals.length === 1 ? +vals[0].text : +vals[1].text
// 			});
// 		});
// 	}

// 	/**
// 	 * Creates an ArrayBounds if the context is a variable and an array.
// 	 * @param subStmt a subStmt context for a variable or a constant.
// 	 * @returns A new array bounds if the context is an array variable.
// 	 */
// 	static create(subStmt: VariableSubStmtContext | ConstSubStmtContext) {
// 		const hasLparenMethod = (x: any): x is VariableSubStmtContext => 'LPAREN' in x;
// 		if (hasLparenMethod(subStmt) && subStmt.LPAREN()) {
// 			return new ArrayBounds(subStmt);
// 		}
// 	}
// }