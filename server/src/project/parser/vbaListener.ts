// Antlr
import { ErrorNode, ParserRuleContext } from 'antlr4ng';
import { vbaListener } from '../../antlr/out/vbaListener';
import { vbapreListener } from '../../antlr/out/vbapreListener';
import { CompilerConditionalStatementContext, CompilerElseStatementContext, CompilerEndIfStatementContext, CompilerIfBlockContext } from '../../antlr/out/vbapreParser';
import {
    AnyOperatorContext,
	ClassModuleContext,
	EnumDeclarationContext,
	GlobalVariableDeclarationContext,
	IgnoredClassAttrContext,
	IgnoredProceduralAttrContext,
	PrivateConstDeclarationContext,
	PrivateTypeDeclarationContext,
	PrivateVariableDeclarationContext,
	ProceduralModuleContext,
	ProcedureDeclarationContext,
	PropertyGetDeclarationContext,
	PropertySetDeclarationContext,
	PublicConstDeclarationContext,
	PublicTypeDeclarationContext,
	PublicVariableDeclarationContext,
	TypeSuffixContext,
	UdtDeclarationContext,
	WhileStatementContext
} from '../../antlr/out/vbaParser';

// Project
import { DuplicateOperatorElement, WhileLoopElement } from '../elements/flow';
import { CompilerLogicalBlock, GenericCommentElement } from '../elements/precompiled';
import { ClassElement, ModuleElement, ModuleIgnoredAttributeElement } from '../elements/module';
import { DocumentSettings, VbaClassDocument, VbaModuleDocument } from '../document';
import { PropertyGetDeclarationElement, PropertyLetDeclarationElement, PropertySetDeclarationElement } from '../elements/procedure';
import { DeclarationStatementElement, EnumDeclarationElement, TypeDeclarationElement, TypeSuffixElement } from '../elements/typing';


class CommonParserCapability {
    document: VbaClassDocument | VbaModuleDocument;
    protected _documentSettings?: DocumentSettings;

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
    protected documentSettings?: DocumentSettings;
    protected isAfterMethodDeclaration = false;

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
        this.documentSettings = await this.document.getDocumentConfiguration();
    }

    enterAnyOperator = (ctx: AnyOperatorContext) => {
        const element = new DuplicateOperatorElement(ctx, this.document.textDocument);
        this.document.registerDiagnosticElement(element);
    }

    enterEnumDeclaration = (ctx: EnumDeclarationContext) => {
        const element = new EnumDeclarationElement(ctx, this.document.textDocument, this.isAfterMethodDeclaration);
        this.document.registerElement(element)
            .registerNamespaceElement(element);
    };

    exitEnumDeclaration = (_: EnumDeclarationContext) =>
        this.document.deregisterNamespaceElement();

    enterClassModule = (ctx: ClassModuleContext) => {
        const element = new ClassElement(ctx, this.document.textDocument, this.documentSettings ?? { doWarnOptionExplicitMissing: true });
        this.document.registerElement(element)
            .registerNamespaceElement(element)
    };

    exitClassModule = (_: ClassModuleContext) =>
        this.document.deregisterNamespaceElement();

    enterIgnoredClassAttr = (ctx: IgnoredClassAttrContext) => this.registerIgnoredAttribute(ctx);
    enterIgnoredProceduralAttr = (ctx: IgnoredProceduralAttrContext) => this.registerIgnoredAttribute(ctx);
    private registerIgnoredAttribute(ctx: IgnoredClassAttrContext | IgnoredProceduralAttrContext) {
        this.document.registerDiagnosticElement(new ModuleIgnoredAttributeElement(ctx, this.document.textDocument))
    }

    enterProceduralModule = (ctx: ProceduralModuleContext) => {
        const element = new ModuleElement(ctx, this.document.textDocument, this.documentSettings ?? { doWarnOptionExplicitMissing: true });
        this.document.registerElement(element)
            .registerNamespaceElement(element)
    };

    exitProceduralModule = (_: ProceduralModuleContext) =>
        this.document.deregisterNamespaceElement();

    // Handles exiting of a sub, func, or property.
    exitProcedureDeclaration = (ctx: ProcedureDeclarationContext) => {
        this.isAfterMethodDeclaration = true;
        this.document.deregisterNamespaceElement();
    };

    enterPropertyGetDeclaration = (ctx: PropertyGetDeclarationContext) => {
        const element = new PropertyGetDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element)
            .registerNamespaceElement(element);
    };

    enterPropertySetDeclaration = (ctx: PropertySetDeclarationContext) => {
        const element = !!ctx.LET()
            ? new PropertyLetDeclarationElement(ctx, this.document.textDocument)
            : new PropertySetDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element)
            .registerNamespaceElement(element);
    };

    enterPublicTypeDeclaration = (ctx: PublicTypeDeclarationContext) => this.enterTypeDeclaration(ctx, true);
    enterPrivateTypeDeclaration = (ctx: PrivateTypeDeclarationContext) => this.enterTypeDeclaration(ctx, false);
    private enterTypeDeclaration = (ctx: PublicTypeDeclarationContext | PrivateTypeDeclarationContext, isPrivate: boolean) => {
        const element = new TypeDeclarationElement(ctx, this.document.textDocument, isPrivate);
        this.document.registerElement(element).registerNamespaceElement(element);
    }

    enterTypeSuffix = (ctx: TypeSuffixContext) =>
        this.document.registerElement(new TypeSuffixElement(ctx, this.document.textDocument));

    // Handles public and private type declarations.
    exitUdtDeclaration = (_: UdtDeclarationContext) =>
        this.document.deregisterNamespaceElement();

    // Variables
    enterPublicConstDeclaration = (ctx: PublicConstDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterPrivateConstDeclaration = (ctx: PrivateConstDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterPublicVariableDeclaration = (ctx: PublicVariableDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterGlobalVariableDeclaration = (ctx: GlobalVariableDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterPrivateVariableDeclaration = (ctx: PrivateVariableDeclarationContext) => this.enterVariableDeclaration(ctx);
    private enterVariableDeclaration = (ctx: PublicConstDeclarationContext | PrivateConstDeclarationContext | PublicVariableDeclarationContext | GlobalVariableDeclarationContext | PrivateVariableDeclarationContext) => {
        const element = DeclarationStatementElement.create(ctx, this.document.textDocument);
        element.declarations.forEach(x => this.document.registerElement(x));
    }

    enterWhileStatement = (ctx: WhileStatementContext) => {
        const element = new WhileLoopElement(ctx, this.document.textDocument)
        this.document.registerDiagnosticElement(element);
    };

    visitErrorNode(node: ErrorNode) {
        console.log(node.getPayload());
    }
}


export class VbaPreListener extends vbapreListener {
    common: CommonParserCapability;

    get text(): string {
        return this.common.document.redactedText;
    }

    constructor(document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.common = new CommonParserCapability(document);
    }

    static async createAsync(document: VbaClassDocument | VbaModuleDocument): Promise<VbaPreListener> {
        const result = new VbaPreListener(document);
        await result.common.ensureHasSettingsAsync();
        return result;
    }

    enterCompilerIfBlock = (ctx: CompilerIfBlockContext) => {
        const doc = this.common.document;
        const docprops = this.common.documentSettings;
        const element = new CompilerLogicalBlock(ctx, doc.textDocument, docprops);

        // Register block subtraction and comment tokens.
        element.inactiveBlocks.forEach(b => {
            doc.registerSubtractElement(b);
            b.linesToComments.forEach(c =>
                doc.registerSemanticToken(c)
                    .registerSemanticToken(c)
            );
        });
    }

    enterCompilerElseStatement = (ctx: CompilerElseStatementContext) => this.registerSemanticComment(ctx);
    enterCompilerEndIfStatement = (ctx: CompilerEndIfStatementContext) => this.registerSemanticComment(ctx);
    enterCompilerConditionalStatement = (ctx: CompilerConditionalStatementContext) => this.registerSemanticComment(ctx);

    private registerSemanticComment(ctx: ParserRuleContext) {
        const doc = this.common.document;
        const element = new GenericCommentElement(ctx, doc.textDocument);
        doc.registerSubtractElement(element);
    }
}