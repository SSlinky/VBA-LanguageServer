import { TextDocument } from 'vscode-languageserver-textdocument';

import { ANTLRInputStream, CommonTokenStream, ConsoleErrorListener, RecognitionException, Recognizer } from 'antlr4ts';

import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';

import { vbaLexer as VbaLexer } from '../../antlr/out/vbaLexer';
import { AttributeStmtContext, ConstStmtContext, EnumerationStmtContext, EnumerationStmt_ConstantContext, FoldingBlockStmtContext, MethodStmtContext, ModuleContext, ModuleHeaderContext, VariableStmtContext, vbaParser as VbaParser } from '../../antlr/out/vbaParser';
import { vbaListener } from '../../antlr/out/vbaListener';

import { VbaClassDocument, VbaModuleDocument } from '../document';
import { FoldableElement } from '../elements/special';
import { ConstDeclarationsElement, EnumBlockDeclarationElement, EnumMemberDeclarationElement, MethodBlockDeclarationElement, VariableDeclarationsElement } from '../elements/memory';
import { ModuleElement } from '../elements/module';

export class SyntaxParser {
    parse(document: VbaClassDocument | VbaModuleDocument) {
        const listener = new VbaTreeWalkListener(document);
        const parser = this.createParser(document.textDocument);

        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }

    private createParser(doc: TextDocument): VbaParser {
        const lexer = new VbaLexer(new ANTLRInputStream(doc.getText()));
        const parser = new VbaParser(new CommonTokenStream(lexer));

        parser.removeErrorListeners();
        parser.addErrorListener(new VbaErrorListener());
        return parser;
    }
}


class VbaTreeWalkListener implements vbaListener {
	document: VbaClassDocument | VbaModuleDocument;

	constructor(document: VbaClassDocument | VbaModuleDocument) {
        this.document = document;
    }

	visitErrorNode(node: ErrorNode) {
        console.log(node.payload);
    }

    enterAttributeStmt = (ctx: AttributeStmtContext) => {
        this.document.activeAttributeElement?.processAttribute(ctx);
    };

    enterConstStmt = (ctx: ConstStmtContext) => {
        const element = new ConstDeclarationsElement(ctx, this.document.textDocument);
        element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
    };

	enterEnumerationStmt = (ctx: EnumerationStmtContext) => {
		const element = new EnumBlockDeclarationElement(ctx, this.document.textDocument);
		this.document.registerFoldableElement(element);
        this.document.registerSemanticToken(element);
        this.document.registerSymbolInformation(element);
        this.document.registerScopedElement(element);
	};

    exitEnumerationStmt = (_: EnumerationStmtContext) => {
        this.document.deregisterScopedElement();
    };

    enterEnumerationStmt_Constant = (ctx: EnumerationStmt_ConstantContext) => {
        const element = new EnumMemberDeclarationElement(ctx, this.document.textDocument);
        this.document.registerSymbolInformation(element);
        this.document.registerSemanticToken(element);
    };

	enterFoldingBlockStmt = (ctx: FoldingBlockStmtContext) => {
		const element = new FoldableElement(ctx, this.document.textDocument);
		this.document.registerFoldableElement(element);
	};

	enterMethodStmt = (ctx: MethodStmtContext) => {
		const element = new MethodBlockDeclarationElement(ctx, this.document.textDocument);
		this.document.registerNamedElement(element);
		this.document.registerFoldableElement(element);
        this.document.registerSymbolInformation(element);
		this.document.registerScopedElement(element);
	};

	exitMethodStmt = (_: MethodStmtContext) => {
		this.document.deregisterScopedElement();
	};

    enterModule = (ctx: ModuleContext) => {
        const element = new ModuleElement(ctx, this.document.textDocument, this.document.symbolKind);
        this.document.registerAttributeElement(element);
        this.document.registerScopedElement(element);
    };

    exitModule = (_: ModuleContext) => {
        const element = this.document.deregisterAttributeElement() as ModuleElement;
        this.document.registerSymbolInformation(element);
        this.document.deregisterScopedElement();
        this.document.deregisterAttributeElement();
    };

	enterModuleHeader = (ctx: ModuleHeaderContext) => {
		const element = new FoldableElement(ctx, this.document.textDocument);
		this.document.registerFoldableElement(element);
	};

    enterVariableStmt = (ctx: VariableStmtContext) => {
        const element = new VariableDeclarationsElement(ctx, this.document.textDocument);
        element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
    };
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
