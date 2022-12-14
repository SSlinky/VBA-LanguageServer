import { ParserRuleContext } from 'antlr4ts';
import { Diagnostic, FoldingRange, Hover, Location, Range, SemanticTokenModifiers, SemanticTokenTypes, SymbolInformation, SymbolKind, uinteger } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AmbiguousIdentifierContext, AttributeStmtContext, BaseTypeContext, ComplexTypeContext, ConstStmtContext, ConstSubStmtContext, EnumerationStmtContext, EnumerationStmt_ConstantContext, FunctionStmtContext, ICS_S_VariableOrProcedureCallContext, LiteralContext, ModuleContext, SubStmtContext, VariableStmtContext, VariableSubStmtContext } from '../antlr/out/vbaParser';
import { SemanticToken } from '../capabilities/vbaSemanticTokens';
import { vbaTypeToSymbolConverter } from './converters';
import { stripQuotes } from './helpers';

export {SyntaxElement, IdentifiableSyntaxElement, UnknownElement, ModuleElement, ModuleAttribute, MethodDeclarationElement as MethodElement, EnumElement, EnumConstant, VariableDeclarationStatementElement as VariableStatementElement, VariableDeclarationElement, IdentifierElement};

interface SyntaxElement {
	uri: string;
	text: string;
	range: Range;
	identifier?: IdentifierElement;
	context: ParserRuleContext;
	symbolKind: SymbolKind;
	semanticToken?: SemanticToken;
	diagnostics: Diagnostic[];
	hoverText: string;
	fqName?: string;
	
	parent?: SyntaxElement;
	children: SyntaxElement[];
	
	getAncestorCount(): number;
	hover(): Hover | undefined;
	isChildOf(element: SyntaxElement): boolean;
	symbolInformation(uri: string): SymbolInformation | undefined;
	foldingRange(): FoldingRange | undefined;
	location(): Location;
	addDiagnostics(diagnostics: Diagnostic[]): void;
}

interface IdentifiableSyntaxElement {
	identifier: IdentifierElement;
	ambiguousIdentifier(): AmbiguousIdentifierContext;
	ambiguousIdentifier(i: number): AmbiguousIdentifierContext;
}

abstract class BaseElement implements SyntaxElement {
	uri: string;
	text: string;
	range: Range;
	identifier?: IdentifierElement;
	context: ParserRuleContext;
	symbolKind: SymbolKind;
	semanticToken?: SemanticToken;
	diagnostics: Diagnostic[] = [];
	hoverText: string;
	fqName?: string;
	
	parent?: SyntaxElement;

	children: SyntaxElement[] = [];
	private _countAncestors = 0;

	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		this.uri = doc.uri;
		this.context = ctx;
		this.range = getCtxRange(ctx, doc);
		this.text = ctx.text;
		this.symbolKind = SymbolKind.Null;
		this.hoverText = '';
	}

	hover = (): Hover | undefined => undefined;
	location = (): Location => Location.create(this.uri, this.range);

	isChildOf(element: SyntaxElement): boolean {
		const tr = this.range;
		const pr = element.range;
		
		const psl = pr.start.line;
		const psc = pr.start.character;
		const tsl = tr.start.line;
		const tsc = tr.start.character;

		const pel = pr.end.line;
		const pec = pr.end.character;
		const tel = tr.end.line;
		const tec = tr.end.character;		

		const prStartEarlier = (psl < tsl) || (psl === tsl && psc <= tsc);
		const prEndsAfter = (pel > tel) || (pel === tel && pec >= tec);

		return prStartEarlier && prEndsAfter;
	}

	symbolInformation = (uri: string): SymbolInformation | undefined =>
		SymbolInformation.create(
			this.identifier!.text,
			this.symbolKind,
			this.range,
			uri,
			this.parent?.identifier?.text ?? '');

	foldingRange = (): FoldingRange | undefined =>
		FoldingRange.create(
			this.range.start.line,
			this.range.end.line,
			this.range.start.character,
			this.range.end.character
		);

	addDiagnostics(diagnostics: Diagnostic[]) {
		this.diagnostics = this.diagnostics.concat(diagnostics);
	}

	// protected setIdentifierFromDoc(doc: TextDocument): void {
	// 	if (this.isIdentifiable(this.context)) {
	// 		const identCtx = this.context.ambiguousIdentifier(0);
	// 		if (identCtx) {
	// 			this.identifier = new IdentifierElement(identCtx, doc);
	// 		}
	// 	}
	// }

	private getParent(): BaseElement | undefined {
		if (this.parent) {
			if (this.parent instanceof BaseElement) {
				return this.parent;
			}
		}
	}

	getAncestorCount(n = 0): number {
		if (this._countAncestors === 0) {
			const pnt = this.getParent();
			if (pnt) {
				this._countAncestors = pnt.getAncestorCount(n + 1);
				return this._countAncestors;
			}
		}
		return this._countAncestors + n;
	} 

	toString = () => `${"-".repeat(this.getAncestorCount())} ${this.constructor.name}: ${this.context.text}`;
}

class UnknownElement extends BaseElement {

}

class IdentifierElement extends BaseElement {
	constructor(ctx: AmbiguousIdentifierContext | LiteralContext, doc: TextDocument) {
		super(ctx, doc);
	}

	createSemanticToken(tokType: SemanticTokenTypes, tokMods?: SemanticTokenModifiers[]) {
		if (!(this.context instanceof AmbiguousIdentifierContext) && !(this.context instanceof LiteralContext))
			return;

		this.semanticToken = new SemanticToken(
			this.range.start.line,
			this.range.start.character,
			this.text.length,
			tokType,
			tokMods ?? []
		);
	}
}

class ModuleElement extends BaseElement {
	constructor(ctx: ModuleContext, doc: TextDocument) {
		super(ctx, doc);
		this.symbolKind = SymbolKind.Module;
		this.fqName = doc.uri;
	}
}

class MethodDeclarationElement extends BaseElement {
	identifier: IdentifierElement;
	returnType: TypeContext | undefined;
	hasPrivateModifier = false;

	constructor(ctx: FunctionStmtContext | SubStmtContext, doc: TextDocument) {
		super(ctx, doc);
		this.hasPrivateModifier = !!(ctx.visibility()?.PRIVATE());
		this.identifier = getIdentifier(ctx, doc);
		if (ctx instanceof FunctionStmtContext) {
			this.returnType = this.getReturnType(doc);
			this.symbolKind = SymbolKind.Function;
		} else {
			this.symbolKind = SymbolKind.Method;
		}
	}

	private getReturnType(doc: TextDocument): TypeContext | undefined {
		const ctx = this.context as FunctionStmtContext;
		const asTypeCtx = ctx.asTypeClause();
		if (!asTypeCtx) { return; }
		const t = asTypeCtx.type_();
		const typeCtx = t.baseType() ?? t.complexType();
		if (typeCtx) {
			return new TypeContext(typeCtx, doc);
		}
	}

	hover = () => this.getHover();

	getHoverText(): string {
		return this.text;
		// const ctx = this.context as FunctionStmtContext | SubStmtContext;
		// let typeHint;
		// if (ctx instanceof FunctionStmtContext) {
		// 	typeHint = ctx.typeHint();
		// }
		// const mdTypeHint = typeHint?.text ?? '';

		// const argsCtx = ctx.argList();

		// const codeFence = '`';
		// return `${codeFence}vba\n${mdTypeHint}${this.identifier}()${codeFence}`;
	}

	private getHover(): Hover {
		return {
			contents: this.hoverText,
			range: this.range
		};
	}
}

class MethodCallElement extends BaseElement {
	/**
	 *
	 */
	constructor(ctx: ICS_S_VariableOrProcedureCallContext, doc: TextDocument) {
		super(ctx, doc);
		
	}
}

class EnumElement extends BaseElement {
	constructor(ctx: EnumerationStmtContext, doc: TextDocument) {
		super(ctx, doc);
		this.symbolKind = SymbolKind.Enum;
		if (this.identifier)
			this.identifier.createSemanticToken(SemanticTokenTypes.enum);
	}
}

class EnumConstant extends BaseElement {
	foldingRange = () => undefined;
	symbolInformation = (_: string) => undefined;
	constructor(ctx: EnumerationStmt_ConstantContext, doc: TextDocument) {
		super(ctx, doc);
		this.symbolKind = SymbolKind.EnumMember;
		if (this.identifier) {
			this.identifier.createSemanticToken(
				SemanticTokenTypes.enumMember);
		}
	}
}

class VariableDeclarationStatementElement extends BaseElement {
	variableList: VariableDeclarationElement[] = [];
	hasPrivateModifier = false;
	foldingRange = () => undefined;

	constructor(ctx: VariableStmtContext | ConstStmtContext, doc: TextDocument) {
		super(ctx, doc);
		this.symbolKind = SymbolKind.Variable;
		this.hasPrivateModifier = !!(ctx.visibility()?.PRIVATE());
		this.resolveDeclarations(ctx, doc);
	}

	hover = (): Hover => ({
		contents: this.hoverText,
		range: this.range
	});

	getHoverText(): string {
		return this.text;
	}

	private resolveDeclarations(ctx: VariableStmtContext | ConstStmtContext, doc: TextDocument) {
		if (ctx instanceof VariableStmtContext) {
			this.resolveVarDeclarations(ctx, doc);
		} else {
			this.resolveConstDeclarations(ctx, doc);
		}
	}

	private resolveVarDeclarations(ctx: VariableStmtContext, doc: TextDocument) {
		const tokenMods = this.getSemanticTokenModifiers(ctx);
		ctx.variableListStmt().variableSubStmt().forEach((x) => 
			this.variableList.push(new VariableDeclarationElement(x, doc, tokenMods, this.hasPrivateModifier)));
	}

	private resolveConstDeclarations(ctx: ConstStmtContext, doc: TextDocument) {
		const tokenMods = this.getSemanticTokenModifiers(ctx);
		ctx.constSubStmt().forEach((x) => this.variableList.push(
			new VariableDeclarationElement(x, doc, tokenMods, this.hasPrivateModifier)));
	}

	private getSemanticTokenModifiers(ctx: VariableStmtContext | ConstStmtContext): SemanticTokenModifiers[] {
		const result: SemanticTokenModifiers[] = [SemanticTokenModifiers.declaration];
		if (ctx instanceof VariableStmtContext && ctx.STATIC())
			result.push(SemanticTokenModifiers.static);
		if (ctx instanceof ConstStmtContext)
			result.push(SemanticTokenModifiers.readonly);
		return result;
	}
}

class VariableDeclarationElement extends BaseElement {
	asType: TypeContext | undefined;
	identifier: IdentifierElement;
	hasPrivateModifier = false;

	constructor(ctx: VariableSubStmtContext | ConstSubStmtContext, doc: TextDocument, tokenModifiers: SemanticTokenModifiers[], hasPrivateModifier: boolean) {
		super(ctx, doc);
		this.identifier = getIdentifier(ctx, doc);
		this.hasPrivateModifier = hasPrivateModifier;
		this.asType = TypeContext.create(ctx, doc);
		this.symbolKind = vbaTypeToSymbolConverter(this.asType?.text ?? 'variant');
		this.createSemanticToken(tokenModifiers);
	}

	private createSemanticToken(tokenModifiers: SemanticTokenModifiers[]) {
		const name = this.identifier!;
		this.semanticToken = new SemanticToken(
			name.range.start.line,
			name.range.start.character,
			name.text.length,
			SemanticTokenTypes.variable,
			tokenModifiers
		);
	}
}

// class VariableElement extends BaseElement {
// 	members: MemberElement[] = [];

// 	constructor(ctx: ICS_S_VariableOrProcedureCallContext, doc: TextDocument) {
// 		super(ctx, doc);
		
// 	}
// }

// class ValueElement extends BaseElement {
// 	method?: MethodCallElement;
// 	variable?: VariableElement;


// 	constructor(ctx: ValueStmtContext, doc: TextDocument) {
// 		super(ctx, doc);
		
// 	}
// }

// class VariableAssignElement extends BaseElement {
// 	leftElement: VariableElement;
// 	rightElement: ValueElement;

// 	constructor(ctx: LetStmtContext | SetStmtContext, doc: TextDocument) {
// 		super(ctx, doc);
		
// 		this.leftElement = this.getLeftHandVariable(doc);
// 		this.rightElement = new ValueElement(ctx.valueStmt(), doc);
		
// 		const callStmtContext = ctx.implicitCallStmt_InStmt();
// 		const varOrProc = callStmtContext.iCS_S_VariableOrProcedureCall();
// 		const isProcedure = !!varOrProc?.subscripts();
// 		if (isProcedure) {
// 			//
// 		} else {
// 			this.rightElement = getVariableAssignment(ctx.valueStmt(), doc);
// 		}
// 	}

// 	private getLeftHandVariable(doc: TextDocument): VariableElement {
// 		const ctx = this.context as LetStmtContext | SetStmtContext;
// 		const varElement = ctx.implicitCallStmt_InStmt().iCS_S_VariableOrProcedureCall();
// 		if (!varElement) {
// 			throw new Error('Context is not a variable.');
// 		}
// 		return new VariableElement(varElement, doc);
// 	}

// 	private getFromVpc(ctx: ICS_S_VariableOrProcedureCallContext, doc: TextDocument): VariableElement | MethodCallElement {
// 		if (ctx.subscripts()) {
// 			return new MethodCallElement(ctx, doc);
// 		}
// 		return new VariableElement(ctx, doc);
// 	}

// 	symbolInformation = (_: string) => undefined;
// }

class ModuleAttribute {
	identifier?: IdentifierElement;
	literal?: IdentifierElement;
	
	key = (): string => this.identifier?.text ?? 'Undefined';
	value = (): string => (this.literal) ? stripQuotes(this.literal.text) : 'Undefined';

	constructor(ctx: AttributeStmtContext, doc: TextDocument) {
		const idCtx = ctx
			.implicitCallStmt_InStmt()
			?.iCS_S_VariableOrProcedureCall()
			?.ambiguousIdentifier();
						
		if (idCtx) {
			this.identifier = new IdentifierElement(idCtx, doc);
			this.literal = new IdentifierElement(idCtx, doc);
		}
	}
}

class TypeContext extends BaseElement {
	constructor(ctx: BaseTypeContext | ComplexTypeContext, doc: TextDocument) {
		super(ctx, doc);
	}

	static create(ctx: VariableSubStmtContext | ConstSubStmtContext, doc: TextDocument): TypeContext | undefined {
		const xCtx = ctx.asTypeClause()?.type_();
		const tCtx = xCtx?.baseType() ?? xCtx?.complexType();
		if (tCtx) { return new TypeContext(tCtx, doc); }
	}
}

function getCtxRange(ctx: ParserRuleContext, doc: TextDocument): Range {
	const start = ctx.start.startIndex;
	const stop = ctx.stop?.stopIndex ?? start;
	return Range.create(
		doc.positionAt(start),
		doc.positionAt(stop + 1));
}

function getIdentifier(ctx: ParserRuleContext, doc: TextDocument): IdentifierElement {
	if (isIdentifiable(ctx)) {
		return new IdentifierElement(
			ctx.ambiguousIdentifier(0), doc);
	}
	throw new Error('Not an identifiable context');
}

function isIdentifiable(o: any): o is IdentifiableSyntaxElement {
	return 'ambiguousIdentifier' in o;
}
