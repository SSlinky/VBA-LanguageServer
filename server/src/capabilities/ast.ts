import { ANTLRInputStream, CommonTokenStream, ParserRuleContext } from 'antlr4ts';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { vbaLexer as VbaLexer } from '../antlr/out/vbaLexer';
import { vbaListener as VbaListener } from '../antlr/out/vbaListener';
import { AmbiguousIdentifierContext, AmbiguousKeywordContext, AttributeStmtContext, BaseTypeContext, ComplexTypeContext, ConstStmtContext, ConstSubStmtContext, FunctionStmtContext, ModuleContext, ModuleHeaderContext, SubStmtContext, VariableStmtContext, VariableSubStmtContext, vbaParser as VbaParser } from '../antlr/out/vbaParser';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { Diagnostic, DiagnosticSeverity, Range, SymbolKind } from 'vscode-languageserver';
import { DocumentSymbolProvider } from './vbaSymbols';
import { stripQuotes } from '../utils/helpers';

export class LanguageTools {
	static lexer = new Map<string, VbaLexer>();
	static parser = new Map<string, VbaParser>();

	diagnostics: Map<string, Diagnostic[]>;
	currentDoc?: TextDocument;
	InputStream?: ANTLRInputStream;
	symbolProvider: DocumentSymbolProvider = new DocumentSymbolProvider();

	constructor() {
		this.diagnostics = new Map<string, Diagnostic[]>();
	}

	private clearTokens(uri: string) {
		this.diagnostics.set(uri, []);
	}

	private getParseTree(doc: TextDocument) {
		this.currentDoc = doc;
		this.InputStream = new ANTLRInputStream(doc.getText());
		const text = doc.getText().toUpperCase();
		const lxr = new VbaLexer(new ANTLRInputStream(text));
		const psr = new VbaParser(new CommonTokenStream(lxr));
		return psr.startRule();
	}

	addDiagnostic(range: Range, severity: DiagnosticSeverity) {
		const diagnostics = this.diagnostics.get(
			this.currentDoc!.uri);

		diagnostics?.push(Diagnostic.create(
			range, "hello world", severity, "E420", "VBA.Pro"));
	}

	evaluate(doc: TextDocument) {
		this.clearTokens(doc.uri);
		this.symbolProvider.setDoc(doc);
		if (doc.getText() === '') { return; }

		ParseTreeWalker.DEFAULT.walk(
			new KeywordListener(this),
			this.getParseTree(doc));
	}
}

class KeywordListener implements VbaListener {
	parent: LanguageTools;

	constructor(parent: LanguageTools) {
		this.parent = parent;
	}

	enterAmbiguousIdentifier(ctx: AmbiguousIdentifierContext) {
		const sp = this.parent.symbolProvider;
		if (sp.requiresName) {
			const doc = this.parent.currentDoc!;
			const originalText = getOriginalText(ctx, doc);
			sp.nameLastSymbol(originalText);
		}
	}

	enterAmbiguousKeyword(ctx: AmbiguousKeywordContext) {
		console.log(`enterAmbiguousKeyword detected: ${ctx.start.line}`);
	}

	enterModule(ctx: ModuleContext) {
		this.parent.symbolProvider.addSymbol(
			getCtxRange(ctx, this.parent.currentDoc!),
			"Module",
			SymbolKind.Module
		);
	}

	enterModuleHeader(_: ModuleHeaderContext) {
		this.parent.symbolProvider.setModuleKind(SymbolKind.Class);
	}

	enterAttributeStmt(ctx: AttributeStmtContext) {
		const attr = new ModuleAttributeStatement(ctx, this.parent.currentDoc!);
		this.parent.symbolProvider.addAttribute(attr.attribute, attr.value);
	}

	enterSubStmt(ctx: SubStmtContext) {
		this.parent.symbolProvider.addSymbol(
			getCtxRange(ctx, this.parent.currentDoc!),
			"UnnamedSubStatement",
			(ctx.ambiguousIdentifier().text === 'CLASS_INITIALIZE') ?
				SymbolKind.Constructor : SymbolKind.Method
		);
	}

	enterFunctionStmt(ctx: FunctionStmtContext) {
		this.parent.symbolProvider.addSymbol(
			getCtxRange(ctx, this.parent.currentDoc!),
			"UnnamedFuncStatement",
			SymbolKind.Function
		);
	}

	enterVariableStmt(ctx: VariableStmtContext) {
		const doc = this.parent.currentDoc!;
		const decs = new DeclarationStatements(ctx, doc);
		const range = getCtxRange(ctx, doc);
		decs.declarations.forEach(dec => {
			this.parent.symbolProvider.addSymbol(
				range,
				dec.identifier,
				dec.symbol
			);
		});
	}

	visitErrorNode(node: ErrorNode) {
		// console.log(`visitErrorNode: ${node.toString()}`);
		// const s = node.symbol;
		// this.parent.addDiagnostic(
		// 	Range.create(
		// 		s.line, s.charPositionInLine,
		// 		s.line, s.charPositionInLine + node.text.length),
		// 	DiagnosticSeverity.Error);
	}
}

class ModuleAttributeStatement {
	attribute: string;
	value: string;

	constructor(ctx: AttributeStmtContext, doc: TextDocument) {
		const idCtx = ctx.implicitCallStmt_InStmt()?.iCS_S_VariableOrProcedureCall()?.ambiguousIdentifier();
		this.attribute = (idCtx) ? getOriginalText(idCtx, doc) : 'Undefined';

		const valCtx = ctx.literal(0);
		this.value = (valCtx) ? stripQuotes(getOriginalText(valCtx, doc)) : 'Undefined';
	}
}

class DeclarationStatement {
	identifier: string;
	symbol: SymbolKind;
	typeName: string;

	constructor(ctx: VariableSubStmtContext | ConstSubStmtContext, doc: TextDocument) {
		const declaredAs = this.getDeclaredAs(ctx, doc);
		this.symbol = declaredAs[0];
		this.typeName = declaredAs[1] ?? '';
		this.identifier = getOriginalText(ctx.ambiguousIdentifier(), doc);
	}

	private getDeclaredAs(ctx: VariableSubStmtContext | ConstSubStmtContext, doc: TextDocument): [SymbolKind, string | undefined] {
		const asCtx = ctx.asTypeClause()?.type_();
		if (!asCtx) {
			return [SymbolKind.Variable, undefined];
		}

		const baseTypeCtx = asCtx.baseType();
		if (baseTypeCtx) { return [this.getBaseType(baseTypeCtx), undefined]; }
		return [SymbolKind.Object, this.getComplexType(asCtx.complexType()!, doc)];

	}

	private getBaseType(ctx: BaseTypeContext): SymbolKind {
		switch (ctx.text) {
			case 'BOOLEAN':
				return SymbolKind.Boolean;
			case 'SINGLE':
			case 'DOUBLE':
			case 'CURRENCY':
			case 'LONG':
			case 'LONGLONG':
			case 'LONGPTR':
				return SymbolKind.Number;
			case 'STRING':
				return SymbolKind.String;
			case 'VARIANT':
			default:
				return SymbolKind.Variable;
		}
	}

	private getComplexType(ctx: ComplexTypeContext, doc: TextDocument): string {
		return getOriginalText(ctx.ambiguousIdentifier(0), doc);
	}
}

class DeclarationStatements {
	declarations: DeclarationStatement[];
	areConstant: boolean;

	constructor(ctx: VariableStmtContext | ConstStmtContext, doc: TextDocument) {
		this.declarations = [];
		this.areConstant = ctx instanceof ConstStmtContext;

		this.getDeclarationContexts(ctx).forEach(o => 
			this.declarations.push(new DeclarationStatement(o, doc)));
	}

	private getDeclarationContexts(ctx: VariableStmtContext | ConstStmtContext) {
		return (ctx instanceof VariableStmtContext) ? ctx.variableListStmt().variableSubStmt() : ctx.constSubStmt();
	}
}

function getOriginalText(ctx: ParserRuleContext, doc: TextDocument): string {
	const range = getCtxRange(ctx, doc);
	return doc.getText(range);
}

function getCtxRange(ctx: ParserRuleContext, doc: TextDocument): Range {
	const start = ctx.start.startIndex;
	const stop = ctx.stop?.stopIndex ?? start;
	return Range.create(
		doc.positionAt(start),
		doc.positionAt(stop + 1));
}
