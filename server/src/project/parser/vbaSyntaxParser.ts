import { TextDocument } from 'vscode-languageserver-textdocument';

import { ANTLRInputStream, CommonTokenStream, ConsoleErrorListener, DefaultErrorStrategy, Parser, RecognitionException, Recognizer } from 'antlr4ts';

import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';

import { vbaLexer as VbaLexer } from '../../antlr/out/vbaLexer';
import { AttributeStmtContext, ConstStmtContext, EnumerationStmtContext, EnumerationStmt_ConstantContext, FoldingBlockStmtContext, MethodStmtContext, ModuleContext, ModuleHeaderContext, OperatorsStmtContext, TypeStmtContext, VariableStmtContext, vbaParser as VbaParser } from '../../antlr/out/vbaParser';
import { vbaListener } from '../../antlr/out/vbaListener';

import { VbaClassDocument, VbaModuleDocument } from '../document';
import { FoldableElement } from '../elements/special';
import { ConstDeclarationsElement, EnumBlockDeclarationElement, EnumMemberDeclarationElement, MethodBlockDeclarationElement, TypeDeclarationElement, VariableDeclarationsElement } from '../elements/memory';
import { ModuleElement } from '../elements/module';
import { sleep } from '../../utils/helpers';
import { CancellationToken } from 'vscode-languageserver';
import { OperatorElement } from '../elements/operator';

export class SyntaxParser {
    private static _lockIdentifier = 0;

    private static _acquireLock(): number {
        this._lockIdentifier += 1;
        return this._lockIdentifier;
    }

    private static _hasLock(lockIdentifier: number): boolean {
        return this._lockIdentifier === lockIdentifier;
    }

    private static _releaseLock(): void {
        this._lockIdentifier = 0;
    }

    async parseAsync(document: VbaClassDocument | VbaModuleDocument, token: CancellationToken): Promise<boolean> {
        // token.onCancellationRequested(e => {
        //     throw new Error("No");
        // });

        // Refuse to do anything that seems like too much work.
        if (document.textDocument.lineCount > 1500) {
            // TODO: Make this an option that people can increase or decrease.
            console.log(`Document oversize: ${document.textDocument.lineCount} lines.`);
            console.warn(`Syntax parsing has been disabled to prevent crashing.`);
            return false;
        }

        // Wait a few seconds to see if any other input has ocurred.
        const lock = SyntaxParser._acquireLock();
        await sleep(1000);
        if (!SyntaxParser._hasLock(lock)) {
            console.info('Newer lock detected. Cancelling parse.');
            return false;
        }
        SyntaxParser._releaseLock();

        // Parse the document.
        this.parse(document);
        return true;
    }

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
        parser.errorHandler = new VbaErrorHandler();
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
		this.document.registerFoldableElement(element)
            .registerSemanticToken(element)
            .registerSymbolInformation(element)
            .registerScopedElement(element);
	};

    exitEnumerationStmt = (_: EnumerationStmtContext) => {
        this.document.deregisterScopedElement();
    };

    enterEnumerationStmt_Constant = (ctx: EnumerationStmt_ConstantContext) => {
        const element = new EnumMemberDeclarationElement(ctx, this.document.textDocument);
        this.document.registerSymbolInformation(element)
            .registerSemanticToken(element);
    };

	enterFoldingBlockStmt = (ctx: FoldingBlockStmtContext) => {
		const element = new FoldableElement(ctx, this.document.textDocument);
		this.document.registerFoldableElement(element);
	};

	enterMethodStmt = (ctx: MethodStmtContext) => {
		const element = new MethodBlockDeclarationElement(ctx, this.document.textDocument);
        this.document.registerNamedElement(element)
            .registerFoldableElement(element)
            .registerSymbolInformation(element)
            .registerSemanticToken(element)
            .registerScopedElement(element);
	};

	exitMethodStmt = (_: MethodStmtContext) => {
		this.document.deregisterScopedElement();
	};

    enterModule = (ctx: ModuleContext) => {
        const element = new ModuleElement(ctx, this.document.textDocument, this.document.symbolKind);
        this.document.registerAttributeElement(element)
            .registerScopedElement(element);
    };

    exitModule = (_: ModuleContext) => {
        const element = this.document.deregisterAttributeElement() as ModuleElement;
        this.document.registerSymbolInformation(element)
            .deregisterScopedElement()
            .deregisterAttributeElement();
    };

	enterModuleHeader = (ctx: ModuleHeaderContext) => {
		const element = new FoldableElement(ctx, this.document.textDocument);
		this.document.registerFoldableElement(element);
	};
    
    enterOperatorsStmt = (ctx: OperatorsStmtContext) => {
        const element = new OperatorElement(ctx, this.document.textDocument);
        this.document.registerDiagnosticElement(element);
    };

    enterTypeStmt = (ctx: TypeStmtContext) => {
        const element = new TypeDeclarationElement(ctx, this.document.textDocument);
        this.document.registerSymbolInformation(element)
            .registerSemanticToken(element);
    };

    enterVariableStmt = (ctx: VariableStmtContext) => {
        const element = new VariableDeclarationsElement(ctx, this.document.textDocument);
        element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
    };
}

class VbaErrorHandler extends DefaultErrorStrategy {
    recover(recognizer: Parser, e: RecognitionException): void {
        const inputStream = recognizer.inputStream;
        if (!recognizer.isMatchedEOF) {
            inputStream.consume();
        }
        this.endErrorCondition(recognizer);
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
    }
}
