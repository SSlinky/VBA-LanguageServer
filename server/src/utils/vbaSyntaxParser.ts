import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { vbaListener } from '../antlr/out/vbaListener';
import { AttributeStmtContext, FunctionStmtContext, ModuleContext, ModuleHeaderContext, StartRuleContext, SubStmtContext, vbaParser } from '../antlr/out/vbaParser';
import { vbaLexer as VbaLexer } from '../antlr/out/vbaLexer';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { MethodElement, ModuleAttribute, ModuleElement, SyntaxElement } from './vbaSyntaxElements';
import { SymbolKind } from 'vscode-languageserver';


export interface ResultsContainer {
	addModule(element: ModuleElement): void;
	addElement(element: SyntaxElement): void;
	identifyElement(identifier: string): void;
	setModuleAttribute(attr: ModuleAttribute): void;
	setModuleSymbol(symbol: SymbolKind): void;
}


export class SyntaxParser {
	parse(doc: TextDocument, resultsContainer: ResultsContainer) {
		ParseTreeWalker.DEFAULT.walk(
			new VbaTreeWalkListener(doc, resultsContainer),
			this.getParseEntryPoint(doc)
		);
	}

	private getParseEntryPoint(doc: TextDocument): StartRuleContext {
		const uText = doc.getText().toUpperCase();
		const lexer = new VbaLexer(new ANTLRInputStream(uText));
		const parser = new vbaParser(new CommonTokenStream(lexer));
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

	// TODO: Implement this.
	visitErrorNode?: ((node: ErrorNode) => void) | undefined;

	enterModule = (ctx: ModuleContext) =>
		this.resultsContainer.addModule(
			new ModuleElement(ctx, this.doc));

	// Only classes have a header. TODO: Test this for forms.
	enterModuleHeader = (_: ModuleHeaderContext) =>
		this.resultsContainer.setModuleSymbol(SymbolKind.Class);

	enterAttributeStmt = (ctx: AttributeStmtContext) =>
		this.resultsContainer.setModuleAttribute(
			new ModuleAttribute(ctx, this.doc));

	// enterAmbiguousIdentifier = (ctx: AmbiguousIdentifierContext) => {
	// 	if (this.resultsContainer.elementRequiresIdentifier) {
	// 		this.resultsContainer.identifyElement(
	// 			getCtxOriginalText(ctx, this.doc));
	// 	}
	// };

	enterSubStmt = (ctx: SubStmtContext) =>
		this.resultsContainer.addElement(
			new MethodElement(ctx, this.doc));

	enterFunctionStmt = (ctx: FunctionStmtContext) =>
		this.resultsContainer.addElement(
			new MethodElement(ctx, this.doc));
}

