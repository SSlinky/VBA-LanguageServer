import { AmbiguousIdentifierContext, AsTypeClauseContext, ConstStmtContext, ConstSubStmtContext, EnumerationStmtContext, EnumerationStmt_ConstantContext, MethodStmtContext, TypeStmtContext, VariableStmtContext, VariableSubStmtContext } from '../../antlr/out/vbaParser';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { BaseContextSyntaxElement, BaseSyntaxElement, HasSemanticToken, HasSymbolInformation } from './base';
import { SemanticTokenModifiers, SemanticTokenTypes, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { FoldableElement } from './special';
import { SymbolInformationFactory } from '../../capabilities/symbolInformation';
import '../../extensions/parserExtensions';


export class IdentifierElement extends BaseContextSyntaxElement {
	constructor(ctx: AmbiguousIdentifierContext, doc: TextDocument) {
		super(ctx, doc);
	}
}


abstract class BaseEnumElement extends FoldableElement implements HasSemanticToken, HasSymbolInformation {
	identifier: IdentifierElement;
	tokenModifiers: SemanticTokenModifiers[] = [];
	abstract tokenType: SemanticTokenTypes;
	abstract symbolKind: SymbolKind;

	constructor(context: EnumerationStmtContext | EnumerationStmt_ConstantContext, document: TextDocument) {
		super(context, document);
		this.identifier = new IdentifierElement(context.ambiguousIdentifier(), document);
	}

	get name(): string { return this.identifier.text; }
	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, this.symbolKind
		);
	}

}


export class EnumBlockDeclarationElement extends BaseEnumElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];
	symbolKind: SymbolKind;

	constructor(context: EnumerationStmtContext, document: TextDocument) {
		super(context, document);
		this.tokenType = SemanticTokenTypes.enum;
		this.symbolKind = SymbolKind.Enum;
	}
}


export class EnumMemberDeclarationElement extends BaseEnumElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];
	symbolKind: SymbolKind;

	constructor(context: EnumerationStmt_ConstantContext, document: TextDocument) {
		super(context, document);
		this.tokenType = SemanticTokenTypes.enumMember;
		this.symbolKind = SymbolKind.EnumMember;
	}
}

abstract class BaseMethodElement extends FoldableElement implements HasSemanticToken, HasSymbolInformation {
	identifier: IdentifierElement;
	tokenModifiers: SemanticTokenModifiers[] = [];
	abstract tokenType: SemanticTokenTypes;
	abstract symbolKind: SymbolKind;

	constructor(context: MethodStmtContext, document: TextDocument) {
		super(context, document);
		this.identifier = new IdentifierElement(context.methodSignatureStmt().ambiguousIdentifier(), document);
	}

	get name(): string { return this.identifier.text; }
	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, this.symbolKind
		);
	}
}

export class MethodBlockDeclarationElement extends BaseMethodElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];
	symbolKind: SymbolKind;

	constructor(context: MethodStmtContext, document: TextDocument) {
		super(context, document);
		this.tokenType = SemanticTokenTypes.method;
		this.symbolKind = SymbolKind.Method;
	}
}

abstract class BaseVariableDeclarationStatementElement extends BaseContextSyntaxElement {
	abstract declarations: VariableDeclarationElement[];

	constructor(context: ConstStmtContext | VariableStmtContext, document: TextDocument) {
		super(context, document);
	}
}

export class ConstDeclarationsElement extends BaseVariableDeclarationStatementElement {
	declarations: VariableDeclarationElement[] = [];

	constructor(context: ConstStmtContext, document: TextDocument) {
		super(context, document);
		context.constSubStmt().forEach((element) =>
			this.declarations.push(new VariableDeclarationElement(
				element, document
			))
		);
	}
}

export class TypeDeclarationElement  extends FoldableElement implements HasSemanticToken, HasSymbolInformation {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];
	identifier: IdentifierElement;
	symbolKind: SymbolKind;

	constructor(context: TypeStmtContext, document: TextDocument) {
		super(context, document);
		this.symbolKind = SymbolKind.Struct;
		this.tokenType = SemanticTokenTypes.struct;
		this.identifier = new IdentifierElement(context.ambiguousIdentifier(), document);
	}

	get name(): string { return this.identifier.text; }
	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, this.symbolKind
		);
	}

}

export class VariableDeclarationsElement extends BaseVariableDeclarationStatementElement {
	declarations: VariableDeclarationElement[] = [];

	constructor(context: VariableStmtContext, document: TextDocument) {
		super(context, document);
		context.variableListStmt().variableSubStmt().forEach((element) =>
			this.declarations.push(new VariableDeclarationElement(
				element, document
			))
		);
	}
}

class VariableDeclarationElement extends BaseContextSyntaxElement implements HasSymbolInformation {
	identifier: IdentifierElement;
	asType: VariableType;
	arrayBounds?: ArrayBounds;

	constructor(context: ConstSubStmtContext | VariableSubStmtContext, document: TextDocument) {
		super(context, document);
		this.asType = new VariableType(context.asTypeClause(), document);
		this.arrayBounds = ArrayBounds.create(context);
		this.identifier = new IdentifierElement(context.ambiguousIdentifier(), document);
	}

	get name(): string { return this.identifier.text; }
	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, this.asType.symbolKind
		);
	}
}

class VariableType extends BaseSyntaxElement {
	typeName: string;
	symbolKind: SymbolKind;

	constructor(context: AsTypeClauseContext | undefined, document: TextDocument, isArray?: boolean) {
		super(context, document);
		this.symbolKind = isArray ? SymbolKind.Array : SymbolKind.Variable;

		// Needs more ternery.
		const type = context?.type_()?.baseType() ?? context?.type_()?.complexType();
		this.typeName = type?.text ?? type?.text ?? 'Variant';
		this.symbolKind = type ? type.toSymbolKind() : SymbolKind.Variable;
	}
}

class ArrayBounds {
	dimensions: { lower: number, upper: number }[] = [];

	constructor(subStmt: VariableSubStmtContext) {
		subStmt.subscripts()?.subscript_().forEach((x) => {
			const vals = x.valueStmt();
			this.dimensions.push({
				lower: vals.length === 1 ? 0 : +vals[0].text,
				upper: vals.length === 1 ? +vals[0].text : +vals[1].text
			});
		});
	}

	/**
	 * Creates an ArrayBounds if the context is a variable and an array.
	 * @param subStmt a subStmt context for a variable or a constant.
	 * @returns A new array bounds if the context is an array variable.
	 */
	static create(subStmt: VariableSubStmtContext | ConstSubStmtContext) {
		const hasLparenMethod = (x: any): x is VariableSubStmtContext => 'LPAREN' in x;
		if (hasLparenMethod(subStmt) && subStmt.LPAREN()) {
			return new ArrayBounds(subStmt);
		}
	}
}