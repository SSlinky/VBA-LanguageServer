import { ANTLRInputStream, CommonTokenStream, ConsoleErrorListener, RecognitionException, Recognizer } from 'antlr4ts';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { vbaListener } from '../antlr/out/vbaListener';
import { AttributeStmtContext, ConstStmtContext, EnumerationStmtContext, EnumerationStmt_ConstantContext, FunctionStmtContext, ImplicitCallStmt_InBlockContext, ImplicitCallStmt_InStmtContext, LetStmtContext, ModuleContext, ModuleHeaderContext, SetStmtContext, StartRuleContext, SubStmtContext, UnknownLineContext, VariableStmtContext, vbaParser } from '../antlr/out/vbaParser';
import { vbaLexer as VbaLexer } from '../antlr/out/vbaLexer';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { MethodElement, ModuleAttribute, ModuleElement, SyntaxElement, EnumElement, EnumConstant as EnumConstantElement, VariableStatementElement, IdentifierElement, VariableAssignElement, VariableDeclarationElement } from './vbaSyntaxElements';
import { SymbolKind } from 'vscode-languageserver';


export interface ResultsContainer {
	module?: ModuleElement;
	addModule(element: ModuleElement): void;
	addElement(element: SyntaxElement): void;
	setModuleAttribute(attr: ModuleAttribute): void;
	addScopeReference(emt: VariableAssignElement): void;
	addScopeDeclaration(emt: MethodElement | VariableDeclarationElement): void;
}


export class SyntaxParser {
	parse(doc: TextDocument, resultsContainer: ResultsContainer) {
		const listener = new VbaTreeWalkListener(doc, resultsContainer);
		const parserEntry = this.getParseEntryPoint(doc);

		ParseTreeWalker.DEFAULT.walk(
			listener,
			parserEntry
		);
	}

	private getParseEntryPoint(doc: TextDocument): StartRuleContext {
		const lexer = new VbaLexer(new ANTLRInputStream(doc.getText()));
		const parser = new vbaParser(new CommonTokenStream(lexer));
		
		parser.removeErrorListeners();
		parser.addErrorListener(new VbaErrorListener());
		return parser.startRule();
	}
}

class VbaTreeWalkListener implements vbaListener {
	doc: TextDocument;
	resultsContainer: ResultsContainer;

	constructor(doc: TextDocument, resultsContainer: ResultsContainer) {
		this.doc = doc;
		this.resultsContainer = resultsContainer;
	}

	visitErrorNode(node: ErrorNode) {
		console.log(node.payload);
	}

	enterUnknownLine = (ctx: UnknownLineContext) => {
		console.log(ctx.text);
	};

	enterModule = (ctx: ModuleContext) =>
		this.resultsContainer.addModule(
			new ModuleElement(ctx, this.doc));

	// Only classes have a header. TODO: Test this for forms.
	enterModuleHeader = (_: ModuleHeaderContext) =>
		this.resultsContainer.module!.symbolKind = SymbolKind.Class;

	enterAttributeStmt = (ctx: AttributeStmtContext) => {
		const attr = new ModuleAttribute(ctx, this.doc);
		this.resultsContainer.setModuleAttribute(attr);
		if (attr.identifier?.text === 'VB_Name') {
			const module = this.resultsContainer.module;
			if (module) {
				module.identifier = attr.literal;
			}
		}
	};

	enterSubStmt = (ctx: SubStmtContext) =>
		this.resultsContainer.addElement(
			new MethodElement(ctx, this.doc));

	enterFunctionStmt = (ctx: FunctionStmtContext) => {
		const e = new MethodElement(ctx, this.doc);
		this.resultsContainer.addScopeDeclaration(e);
	};

	enterEnumerationStmt = (ctx: EnumerationStmtContext) =>
		this.resultsContainer.addElement(
			new EnumElement(ctx, this.doc));

	enterEnumerationStmt_Constant = (ctx: EnumerationStmt_ConstantContext) =>
		this.resultsContainer.addElement(
			new EnumConstantElement(ctx, this.doc));

	enterVariableStmt = (ctx: VariableStmtContext) => this.enterVarOrConstStmt(ctx);
	enterConstStmt = (ctx: ConstStmtContext) => this.enterVarOrConstStmt(ctx);

	private enterVarOrConstStmt(ctx: VariableStmtContext | ConstStmtContext) {
		const declaration = new VariableStatementElement(ctx, this.doc);
		this.resultsContainer.addElement(declaration);
		declaration.variableList.forEach((v) => this.resultsContainer.addScopeDeclaration(v));
	}

	enterImplicitCallStmt_InStmt = (ctx: ImplicitCallStmt_InStmtContext) => this.enterImplicitCallStmt(ctx);
	enterImplicitCallStmt_InBlock = (ctx: ImplicitCallStmt_InBlockContext) => this.enterImplicitCallStmt(ctx);

	private enterImplicitCallStmt(ctx: ImplicitCallStmt_InStmtContext | ImplicitCallStmt_InBlockContext) {
		// console.log('imp call ' + ctx.text);
	}

	enterLetStmt = (ctx: LetStmtContext) => this.enterAssignStmt(ctx);
	enterSetStmt = (ctx: SetStmtContext) => this.enterAssignStmt(ctx);

	private enterAssignStmt(ctx: LetStmtContext | SetStmtContext) {
		const assignment = new VariableAssignElement(ctx, this.doc);
		this.resultsContainer.addScopeReference(assignment);
	}
}

class VbaErrorListener extends ConsoleErrorListener {
	syntaxError<T>(recognizer: Recognizer<T, any>, offendingSymbol: T, line: number, charPositionInLine: number, msg: string, e: RecognitionException | undefined): void {
		super.syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e);
		console.error(e);
		if (e) {
			const y = recognizer.getErrorHeader(e);
			console.log(y);
		}
		recognizer.inputStream?.consume();
	}
}