import { TextDocument } from 'vscode-languageserver-textdocument';

import { vbaLexer } from '../../antlr/out/vbaLexer';
import {  ClassModuleContext, ModuleContext, ProceduralModuleBodyContext, ProceduralModuleContext, ProcedureDeclarationContext, vbaParser } from '../../antlr/out/vbaParser';
import { vbaListener } from '../../antlr/out/vbaListener';

import { VbaClassDocument, VbaModuleDocument } from '../document';
import { FoldableElement } from '../elements/special';
import { sleep } from '../../utils/helpers';
import { CancellationToken } from 'vscode-languageserver';
import { CharStream, CommonTokenStream, ConsoleErrorListener, DefaultErrorStrategy, ParseTreeWalker, Parser, RecognitionException, Recognizer } from 'antlr4ng';
import { ClassElement, ModuleElement } from '../elements/module';
import { DeclarationElement } from '../elements/memory';

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
        console.info('Parsing the document.');
        const listener = new VbaListener(document);
        const parser = this.createParser(document.textDocument);
        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }

    private createParser(doc: TextDocument): VbaParser {
        const lexer = new VbaLexer(CharStream.fromString(doc.getText()));
        const parser = new VbaParser(new CommonTokenStream(lexer));

        parser.removeErrorListeners();
        parser.errorHandler = new VbaErrorHandler();
        return parser;
    }
}

class VbaLexer extends vbaLexer {
    constructor(input: CharStream) {
        super(input);
    }
}

class VbaParser extends vbaParser {

}

class VbaListener extends vbaListener {
	document: VbaClassDocument | VbaModuleDocument;

	constructor(document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.document = document;
    }

    enterProceduralModule = (ctx: ProceduralModuleContext) => {
        const element = new ModuleElement(ctx, this.document.textDocument);
        this.document.registerSymbolInformation(element)
            .registerDiagnosticElement(element)
            .registerScopedElement(element);
    };

    enterClassModule = (ctx: ClassModuleContext) => {
        const element = new ClassElement(ctx, this.document.textDocument);
        this.document.registerSymbolInformation(element)
            .registerDiagnosticElement(element)
            .registerScopedElement(element);
    };

    enterProcedureDeclaration = (ctx: ProcedureDeclarationContext) => {
        // TODO: figure out how to handle scope for properties.
        const element = DeclarationElement.create(ctx, this.document);
        this.document.registerSymbolInformation(element)
            .registerFoldableElement(element)
            .registerNamedElement(element)
            .registerScopedElement(element);
    };

	// visitErrorNode(node: ErrorNode) {
    //     console.log(node.payload);
    // }

    // enterAttributeStmt = (ctx: AttributeStmtContext) => {
    //     this.document.activeAttributeElement?.processAttribute(ctx);
    // };

    // enterConstStmt = (ctx: ConstStmtContext) => {
    //     const element = new ConstDeclarationsElement(ctx, this.document.textDocument);
    //     element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
    // };

	// enterEnumerationStmt = (ctx: EnumerationStmtContext) => {
	// 	const element = new EnumBlockDeclarationElement(ctx, this.document.textDocument);
	// 	this.document.registerFoldableElement(element)
    //         .registerSemanticToken(element)
    //         .registerSymbolInformation(element)
    //         .registerScopedElement(element);
	// };

    // exitEnumerationStmt = (_: EnumerationStmtContext) => {
    //     this.document.deregisterScopedElement();
    // };

    // enterEnumerationStmt_Constant = (ctx: EnumerationStmt_ConstantContext) => {
    //     const element = new EnumMemberDeclarationElement(ctx, this.document.textDocument);
    //     this.document.registerSymbolInformation(element)
    //         .registerSemanticToken(element);
    // };

	// enterFoldingBlockStmt = (ctx: FoldingBlockStmtContext) => {
	// 	const element = new FoldableElement(ctx, this.document.textDocument);
	// 	this.document.registerFoldableElement(element);
	// };

	// enterMethodStmt = (ctx: MethodStmtContext) => {
	// 	const element = new MethodBlockDeclarationElement(ctx, this.document.textDocument);
    //     this.document.registerNamedElement(element)
    //         .registerFoldableElement(element)
    //         .registerSymbolInformation(element)
    //         .registerSemanticToken(element)
    //         .registerScopedElement(element);
	// };

	// exitMethodStmt = (_: MethodStmtContext) => {
	// 	this.document.deregisterScopedElement();
	// };

    // enterModule = (ctx: ModuleContext) => {
    //     const element = new ModuleElement(ctx, this.document.textDocument, this.document.symbolKind);
    //     this.document.registerAttributeElement(element)
    //         .registerDiagnosticElement(element)
    //         .registerScopedElement(element);
    // };

    // exitModule = (_: ModuleContext) => {
    //     const element = this.document.deregisterAttributeElement() as ModuleElement;
    //     this.document.registerSymbolInformation(element)
    //         .deregisterScopedElement()
    //         .deregisterAttributeElement();
    // };

	// enterModuleHeader = (ctx: ModuleHeaderContext) => {
	// 	const element = new FoldableElement(ctx, this.document.textDocument);
	// 	this.document.registerFoldableElement(element);
	// };
    
    // enterOperatorsStmt = (ctx: OperatorsStmtContext) => {
    //     const element = new OperatorElement(ctx, this.document.textDocument);
    //     this.document.registerDiagnosticElement(element);
    // enterModule = (ctx: ModuleContext) => {
    //     const element = new ModuleElement(ctx, this.document.textDocument, this.document.symbolKind);
    //     this.document.registerAttributeElement(element)
    //         .registerScopedElement(element);
    // };

    // enterTypeStmt = (ctx: TypeStmtContext) => {
    //     const element = new TypeDeclarationElement(ctx, this.document.textDocument);
    //     this.document.registerSymbolInformation(element)
    //         .registerSemanticToken(element);
    // };

    // enterVariableStmt = (ctx: VariableStmtContext) => {
    //     const element = new VariableDeclarationsElement(ctx, this.document.textDocument);
    //     element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
    // };

    // enterWhileWendStmt = (ctx: WhileWendStmtContext) => {
    //     const element = new  WhileWendLoopElement(ctx, this.document.textDocument);
    //     this.document.registerDiagnosticElement(element);
    // };
}

class VbaErrorHandler extends DefaultErrorStrategy {
    recover(recognizer: Parser, e: RecognitionException): void {
        const inputStream = recognizer.inputStream;
        // if (!recognizer.isMatchedEOF) {
            inputStream.consume();
        // }
        this.endErrorCondition(recognizer);
    }
}

// class VbaErrorListener extends ConsoleErrorListener {
//     syntaxError<T>(recognizer: Recognizer<T, any>, offendingSymbol: T, line: number, charPositionInLine: number, msg: string, e: RecognitionException | undefined): void {
//         super.syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e);
//         console.error(e);
//         if (e) {
//             const y = recognizer.getErrorHeader(e);
//             console.log(y);
//         }
//     }
// }

// class VbaTreeWalkListener implements vbaListener {
// 	document: VbaClassDocument | VbaModuleDocument;

// 	constructor(document: VbaClassDocument | VbaModuleDocument) {
//         this.document = document;
//     }

// 	visitErrorNode(node: ErrorNode) {
//         console.log(node.payload);
//     }

//     enterAttributeStmt = (ctx: AttributeStmtContext) => {
//         this.document.activeAttributeElement?.processAttribute(ctx);
//     };

//     enterConstStmt = (ctx: ConstStmtContext) => {
//         const element = new ConstDeclarationsElement(ctx, this.document.textDocument);
//         element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
//     };

// 	enterEnumerationStmt = (ctx: EnumerationStmtContext) => {
// 		const element = new EnumBlockDeclarationElement(ctx, this.document.textDocument);
// 		this.document.registerFoldableElement(element);
//         this.document.registerSemanticToken(element);
//         this.document.registerSymbolInformation(element);
//         this.document.registerScopedElement(element);
// 	};

//     exitEnumerationStmt = (_: EnumerationStmtContext) => {
//         console.warn("Entered enum statement.");
//         this.document.deregisterScopedElement();
//     };

//     enterEnumerationStmt_Constant = (ctx: EnumerationStmt_ConstantContext) => {
//         const element = new EnumMemberDeclarationElement(ctx, this.document.textDocument);
//         this.document.registerSymbolInformation(element);
//         this.document.registerSemanticToken(element);
//     };

// 	enterFoldingBlockStmt = (ctx: FoldingBlockStmtContext) => {
// 		const element = new FoldableElement(ctx, this.document.textDocument);
// 		this.document.registerFoldableElement(element);
// 	};

// 	enterMethodStmt = (ctx: MethodStmtContext) => {
// 		const element = new MethodBlockDeclarationElement(ctx, this.document.textDocument);
// 		this.document.registerNamedElement(element);
// 		this.document.registerFoldableElement(element);
//         this.document.registerSymbolInformation(element);
// 		this.document.registerScopedElement(element);
// 	};

// 	exitMethodStmt = (_: MethodStmtContext) => {
// 		this.document.deregisterScopedElement();
// 	};

//     enterModule = (ctx: ModuleContext) => {
//         const element = new ModuleElement(ctx, this.document.textDocument, this.document.symbolKind);
//         this.document.registerAttributeElement(element);
//         this.document.registerScopedElement(element);
//     };

//     exitModule = (_: ModuleContext) => {
//         const element = this.document.deregisterAttributeElement() as ModuleElement;
//         this.document.registerSymbolInformation(element);
//         this.document.deregisterScopedElement();
//         this.document.deregisterAttributeElement();
//     };

// 	enterModuleHeader = (ctx: ModuleHeaderContext) => {
// 		const element = new FoldableElement(ctx, this.document.textDocument);
// 		this.document.registerFoldableElement(element);
// 	};

//     enterVariableStmt = (ctx: VariableStmtContext) => {
//         console.warn("Entered value statement. " + ctx.text);
//         const element = new VariableDeclarationsElement(ctx, this.document.textDocument);
//         element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
//     };

//     enterOperatorsStmt = (ctx: OperatorsStmtContext) => {
//         const element = new OperatorElement(ctx, this.document.textDocument);
//         this.document.registerDiagnosticElement(element);
//     };
// }

// class VbaErrorListener extends ConsoleErrorListener {
//     syntaxError<T>(recognizer: Recognizer<T, any>, offendingSymbol: T, line: number, charPositionInLine: number, msg: string, e: RecognitionException | undefined): void {
//         super.syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e);
//         console.error(e);
//         if (e) {
//             const y = recognizer.getErrorHeader(e);
//             console.log(y);
//         }
//         recognizer.inputStream?.consume();
//     }
// }
