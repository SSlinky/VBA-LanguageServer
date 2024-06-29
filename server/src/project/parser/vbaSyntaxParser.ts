import { TextDocument } from 'vscode-languageserver-textdocument';

import { vbaLexer } from '../../antlr/out/vbaLexer';
import {  ClassModuleContext, ConstItemContext, EnumDeclarationContext, IgnoredAttrContext, ProceduralModuleContext, ProcedureDeclarationContext, UdtDeclarationContext, WhileStatementContext, vbaParser } from '../../antlr/out/vbaParser';
import { vbaListener } from '../../antlr/out/vbaListener';

import { DocumentSettings, VbaClassDocument, VbaModuleDocument } from '../document';
import { CancellationToken } from 'vscode-languageserver';
import { CharStream, CommonTokenStream, DefaultErrorStrategy, ErrorNode, ParseTreeWalker, Parser, RecognitionException } from 'antlr4ng';
import { ClassElement, IgnoredAttributeElement, ModuleElement } from '../elements/module';
import { ConstDeclarationElement, DeclarationElement, EnumDeclarationElement, TypeDeclarationElement } from '../elements/memory';
import { WhileLoopElement } from '../elements/flow';

export class SyntaxParser {
    async parseAsync(document: VbaClassDocument | VbaModuleDocument, token: CancellationToken): Promise<boolean> {
        console.debug(`Parse requested: ${document.textDocument.version}`);
        const listener = new VbaListener(document);
        await listener.ensureHasSettings();
        const parser = this.createParser(document.textDocument);
        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule(),
            token
        );
        return true;
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
    protected _documentSettings?: DocumentSettings;
    protected _isAfterMethodDeclaration = false;

	constructor(document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.document = document;
    }

    async ensureHasSettings() {
        this._documentSettings = await this.document.getDocumentConfiguration();
    }

    enterEnumDeclaration = (ctx: EnumDeclarationContext) => {
        const element = new EnumDeclarationElement(ctx, this.document.textDocument, this._isAfterMethodDeclaration);
        this.document.registerFoldableElement(element)
            .registerScopedElement(element)
            .registerSemanticToken(element)
            .registerSymbolInformation(element)
            .registerDiagnosticElement(element);
        element.declaredNames.forEach(names =>
            names.forEach(name => this.document
                .registerSemanticToken(name)
                .registerSymbolInformation(name))
        );
    };

    exitEnumDeclaration = (_: EnumDeclarationContext) => {
        this.document.deregisterScopedElement();
    };

    enterClassModule = (ctx: ClassModuleContext) => {
        const element = new ClassElement(ctx, this.document.textDocument, this._documentSettings ?? {doWarnOptionExplicitMissing: true});
        this.document.registerSymbolInformation(element)
            .registerDiagnosticElement(element)
            .registerScopedElement(element);
    };

    exitClassModule = (ctx: ClassModuleContext) => {
        this.document.deregisterScopedElement();
    };

    enterConstItem = (ctx: ConstItemContext) => {
        const element = new ConstDeclarationElement(ctx, this.document.textDocument);
        this.document.registerSemanticToken(element)
            .registerSymbolInformation(element);
    };

    enterIgnoredAttr = (ctx: IgnoredAttrContext) => {
        const element = new IgnoredAttributeElement(ctx, this.document.textDocument);
        this.document.registerDiagnosticElement(element);
    };

    enterProceduralModule = (ctx: ProceduralModuleContext) => {
        const element = new ModuleElement(ctx, this.document.textDocument, this._documentSettings ?? {doWarnOptionExplicitMissing: true});
        this.document.registerSymbolInformation(element)
            .registerDiagnosticElement(element)
            .registerScopedElement(element);
    };

    exitProceduralModule = (ctx: ProceduralModuleContext) => {
        this.document.deregisterScopedElement();
    };

    enterProcedureDeclaration = (ctx: ProcedureDeclarationContext) => {
        const element = DeclarationElement.create(ctx, this.document);
        this.document.registerSymbolInformation(element)
            .registerFoldableElement(element)
            .registerScopedElement(element);

        if (element.isPropertyElement() && element.countDeclarations === 1) {
            this.document.registerDiagnosticElement(element)
                .registerNamedElement(element);
        }
    };

    exitProcedureDeclaration = (ctx: ProcedureDeclarationContext) => {
        this._isAfterMethodDeclaration = true;
        this.document.deregisterScopedElement();
    };

    enterUdtDeclaration = (ctx: UdtDeclarationContext) => {
        const element = new TypeDeclarationElement(ctx, this.document.textDocument);
        this.document.registerFoldableElement(element)
            .registerSemanticToken(element)
            .registerSymbolInformation(element);
        element.declaredNames.forEach(names =>
            names.forEach(name => this.document
                .registerSemanticToken(name)
                .registerSymbolInformation(name))
        );
    };

    enterWhileStatement = (ctx: WhileStatementContext) => {
        const element = new WhileLoopElement(ctx, this.document.textDocument);
        this.document.registerDiagnosticElement(element);
    };

	visitErrorNode(node: ErrorNode) {
        console.log(node.getPayload());
    }

    // enterAttributeStmt = (ctx: AttributeStmtContext) => {
    //     this.document.activeAttributeElement?.processAttribute(ctx);
    // };

    // enterConstStmt = (ctx: ConstStmtContext) => {
    //     const element = new ConstDeclarationsElement(ctx, this.document.textDocument);
    //     element.declarations.forEach((e) => this.document.registerSymbolInformation(e));
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
