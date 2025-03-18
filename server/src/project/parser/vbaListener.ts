// Antlr
import { ErrorNode, Parser, ParserRuleContext } from 'antlr4ng';
import { vbaListener } from '../../antlr/out/vbaListener';
import { vbapreListener } from '../../antlr/out/vbapreListener';
import { vbafmtListener } from '../../antlr/out/vbafmtListener';
import { CompilerConditionalStatementContext, CompilerElseStatementContext, CompilerEndIfStatementContext, CompilerIfBlockContext } from '../../antlr/out/vbapreParser';
import {
    AnyOperatorContext,
	ClassModuleContext,
	EnumDeclarationContext,
	FunctionDeclarationContext,
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
	SubroutineDeclarationContext,
	TypeSuffixContext,
	UdtDeclarationContext,
	UnexpectedEndOfLineContext,
	WhileStatementContext
} from '../../antlr/out/vbaParser';

// Project
import { DuplicateOperatorElement, WhileLoopElement } from '../elements/flow';
import { CompilerLogicalBlock } from '../elements/precompiled';
import { ClassElement, ModuleElement, ModuleIgnoredAttributeElement } from '../elements/module';
import { DocumentSettings, VbaClassDocument, VbaModuleDocument } from '../document';
import { FunctionDeclarationElement, PropertyGetDeclarationElement, PropertyLetDeclarationElement, PropertySetDeclarationElement, SubDeclarationElement } from '../elements/procedure';
import { DeclarationStatementElement, EnumDeclarationElement, TypeDeclarationElement, TypeSuffixElement } from '../elements/typing';
import { UnexpectedEndOfLineElement } from '../elements/utils';
import { ContinuationContext, MethodBodyContext, MethodOpenContext, MethodParametersContext } from '../../antlr/out/vbafmtParser';
import { Range } from 'vscode-languageserver';


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

    enterSubroutineDeclaration = (ctx: SubroutineDeclarationContext) => {
        const element = new SubDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    }

    enterFunctionDeclaration = (ctx: FunctionDeclarationContext) => {
        const element = new FunctionDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    }

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

    enterUnexpectedEndOfLine = (ctx: UnexpectedEndOfLineContext) => {
        const element = new UnexpectedEndOfLineElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    }

    enterWhileStatement = (ctx: WhileStatementContext) => {
        const element = new WhileLoopElement(ctx, this.document.textDocument)
        this.document.registerDiagnosticElement(element);
    };

    visitErrorNode(node: ErrorNode) {
        this.document.workspace.logger.error(`Listener error @ ${node.getPayload()?.line ?? '--'}: ${node.getPayload()?.text}`);
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
        element.inactiveBlocks.forEach(
            b => doc.registerElement(b)
                .registerSubtractElement(b)
        );
    }
}


export class VbaFmtListener extends vbafmtListener {
    common: CommonParserCapability;
    private continuedElements: ParserRuleContext[] = [];
    private activeElements: ParserRuleContext[] = [];
     indentOffsets: number[];

    constructor(document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.common = new CommonParserCapability(document);
        this.indentOffsets = new Array(document.textDocument.lineCount);
    }

    static async createAsync(document: VbaClassDocument | VbaModuleDocument): Promise<VbaFmtListener> {
        const result = new VbaFmtListener(document);
        await result.common.ensureHasSettingsAsync();
        return result;
    }

    getIndent(n: number): number {
        let result: number | undefined;

        for (let i = n; !result && i >= 0; i--) {
            result = this.indentOffsets[i];
        }
        return (result ?? 0);
    }

    // Line ending treatments.
    enterContinuation = (ctx: ContinuationContext) => {
        const activeElement = this.activeElements.at(-1);
        const continuedElement = this.continuedElements.at(-1);
        if (activeElement) {
            // Don't indent if we're already indented.
            if (continuedElement?.hasPositionOf(activeElement))
                return;
            
            // Flag this element as continued / indented.
            this.continuedElements.push(activeElement);

            // Indent the next line.
            const doc = this.common.document.textDocument;
            const line = ctx.toRange(doc).start.line;
            this.indentAt(line + 1, 2);
        }
    }

    enterMethodOpen = (ctx: MethodOpenContext) =>
        this.activeElements.push(ctx);

    exitMethodOpen = (ctx: MethodOpenContext) => {
        this.outdentOnExit(ctx);
        this.exitContinuableElement(ctx);
    }

    enterMethodBody = (ctx: MethodBodyContext) => {
        this.indentOnEnter(ctx);
    }

    exitMethodBody = (ctx: MethodBodyContext) => {
        this.outdentOnExit(ctx);
        this.exitContinuableElement(ctx);
    }
    
    enterMethodParameters = (ctx: MethodParametersContext) =>
        this.activeElements.push(ctx);

    exitMethodParameters = (ctx: MethodParametersContext) =>
        this.exitContinuableElement(ctx);

    private indentOnEnter(ctx: ParserRuleContext): void {
        this.activeElements.push(ctx);
        const doc = this.common.document.textDocument;
        const line = ctx.toRange(doc).start.line;
        this.indentAt(line, 2);
    }

    private outdentOnExit(ctx: ParserRuleContext): void {
        const doc = this.common.document.textDocument;
        const line = ctx.toRange(doc).end.line + 1;
        if (line >= this.indentOffsets.length) return;
        this.indentAt(line + 1, -2);
    }

    private exitContinuableElement(ctx: ParserRuleContext): void {
        // Remove from continued stack if required.
        const e = this.continuedElements.at(-1);
        if (e?.hasPositionOf(ctx)) {
            this.continuedElements.pop();

            // Outdent the next line
            const doc = this.common.document.textDocument;
            const line = ctx.toRange(doc).start.line + 1;
            this.indentAt(line + 1, -2);
        }

        // Remove from active elements.
        this.activeElements.pop();
    }

    private indentAt(line: number, offset: number): void {
        const n = this.getIndent(line);
        this.indentOffsets[line] = n + offset;
    }
}