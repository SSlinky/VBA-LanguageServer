import { ErrorNode } from 'antlr4ng';
import { vbaListener } from '../../antlr/out/vbaListener';
import { ConstItemContext, EnumDeclarationContext, IgnoredAttrContext, ProcedureDeclarationContext, UdtDeclarationContext, WhileStatementContext } from '../../antlr/out/vbaParser';

import { DocumentSettings, VbaClassDocument, VbaModuleDocument } from '../document';

import { WhileLoopElement } from '../elements/flow';
import { IgnoredAttributeElement } from '../elements/module';
import { ConstDeclarationElement, EnumDeclarationElement, TypeDeclarationElement } from '../elements/memory';
import { vbapreListener } from '../../antlr/out/vbapreListener';
import { CompilerIfBlockContext } from '../../antlr/out/vbapreParser';
import { CompilerIfBlockElement } from '../elements/special';


class CommonParserCapability {
    document: VbaClassDocument | VbaModuleDocument;
    protected _documentSettings?: DocumentSettings;
    protected _isAfterMethodDeclaration = false;

    get documentSettings(): DocumentSettings {
        if (!this._documentSettings) {
            throw new Error("Sad times");

        }
        return this._documentSettings;
    }

    constructor(document: VbaClassDocument | VbaModuleDocument) {
        this.document = document;
    }

    async ensureHasSettingsAsync() {
        this._documentSettings = await this.document.getDocumentConfiguration();
    }
}

export class VbaListener extends vbaListener {
    document: VbaClassDocument | VbaModuleDocument;
    protected _documentSettings?: DocumentSettings;
    protected _isAfterMethodDeclaration = false;

    constructor(document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.document = document;
    }

    static async createAsync(document: VbaClassDocument | VbaModuleDocument): Promise<VbaListener> {
        const result = new VbaListener(document);
        await result.ensureHasSettingsAsync();
        return result;
    }

    async ensureHasSettingsAsync() {
        this._documentSettings = await this.document.getDocumentConfiguration();
    }

    enterEnumDeclaration = (ctx: EnumDeclarationContext) => {
        const element = new EnumDeclarationElement(ctx, this.document.textDocument, this._isAfterMethodDeclaration);
        this.document.registerFoldableElement(element)
            // .registerScopedElement(element)
            .registerSemanticToken(element)
            .registerSymbolInformation(element)
            .registerDiagnosticElement(element);
        element.declaredNames.forEach(names =>
            names.forEach(name => this.document
                .registerSemanticToken(name)
                .registerSymbolInformation(name))
        );
    };

    // exitEnumDeclaration = (_: EnumDeclarationContext) => {
    //     this.document.deregisterScopedElement();
    // };

    // enterClassModule = (ctx: ClassModuleContext) => {
    //     const element = new ClassElement(ctx, this.document.textDocument, this._documentSettings ?? { doWarnOptionExplicitMissing: true });
    //     this.document.registerSymbolInformation(element)
    //         .registerDiagnosticElement(element)
    //         .registerScopedElement(element);
    // };

    // exitClassModule = (ctx: ClassModuleContext) => {
    //     this.document.deregisterScopedElement();
    // };

    enterConstItem = (ctx: ConstItemContext) => {
        const element = new ConstDeclarationElement(ctx, this.document.textDocument);
        this.document.registerSemanticToken(element)
            .registerSymbolInformation(element);
    };

    enterIgnoredAttr = (ctx: IgnoredAttrContext) => {
        const element = new IgnoredAttributeElement(ctx, this.document.textDocument);
        this.document.registerDiagnosticElement(element);
    };

    // enterProceduralModule = (ctx: ProceduralModuleContext) => {
    //     const element = new ModuleElement(ctx, this.document.textDocument, this._documentSettings ?? { doWarnOptionExplicitMissing: true });
    //     this.document.registerSymbolInformation(element)
    //         .registerDiagnosticElement(element)
    //         .registerScopedElement(element);
    // };

    // exitProceduralModule = (ctx: ProceduralModuleContext) => {
    //     this.document.deregisterScopedElement();
    // };

    // enterProcedureDeclaration = (ctx: ProcedureDeclarationContext) => {
    //     const element = DeclarationElement.create(ctx, this.document);
    //     this.document.registerSymbolInformation(element)
    //         .registerFoldableElement(element)
    //         .registerScopedElement(element);

    //     if (element.isPropertyElement() && element.countDeclarations === 1) {
    //         this.document.registerDiagnosticElement(element)
    //             .registerNamedElement(element);
    //     }
    // };

    exitProcedureDeclaration = (ctx: ProcedureDeclarationContext) => {
        this._isAfterMethodDeclaration = true;
        // this.document.deregisterScopedElement();
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

export class VbaPreListener extends vbapreListener {
    common: CommonParserCapability;
    private _documentText: string;

    get text(): string {
        return this._documentText;
    }

    constructor(document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.common = new CommonParserCapability(document);
        this._documentText = document.textDocument.getText();
    }

    static async createAsync(document: VbaClassDocument | VbaModuleDocument): Promise<VbaPreListener> {
        const result = new VbaPreListener(document);
        await result.common.ensureHasSettingsAsync();
        return result;
    }

    enterCompilerIfBlock = (ctx: CompilerIfBlockContext) => {
        const doc = this.common.document;
        const docprops = this.common.documentSettings;
        const element = new CompilerIfBlockElement(ctx, doc.textDocument, docprops);

        element.inactiveChildren.forEach(e => doc.registerCommentBlock(e));
        // TODO: Semantic tokens don't appear to be able to go across lines
        // so I'll need to add _each line_ separately!
    }
}