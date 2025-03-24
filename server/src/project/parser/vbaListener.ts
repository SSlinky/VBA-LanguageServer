// Core
import { Range } from 'vscode-languageserver';

// Antlr
import { ErrorNode, ParserRuleContext } from 'antlr4ng';
import { vbaListener } from '../../antlr/out/vbaListener';
import { vbapreListener } from '../../antlr/out/vbapreListener';
import { vbafmtListener } from '../../antlr/out/vbafmtListener';
import { CompilerIfBlockContext } from '../../antlr/out/vbapreParser';
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
import {
    AttributeStatementContext,
    BasicStatementContext,
    BlockContext,
    CaseDefaultStatementContext,
    CaseStatementContext,
    ClassHeaderBlockContext,
    ContinuationContext,
    DocumentElementContext,
    IndentAfterElementContext,
    LabelStatementContext,
    LineEndingContext,
    MethodParametersContext,
    OutdentBeforeElementContext,
    OutdentOnIndentAfterElementContext,
    PreBlockContext,
    PreIfElseBlockContext,
    SelectCaseCloseContext,
    SelectCaseOpenContext
} from '../../antlr/out/vbafmtParser';

// Project
import { CompilerLogicalBlock } from '../elements/precompiled';
import { UnexpectedEndOfLineElement } from '../elements/utils';
import { DuplicateOperatorElement, WhileLoopElement } from '../elements/flow';
import { VbaClassDocument, VbaModuleDocument } from '../document';
import { ClassElement, ModuleElement, ModuleIgnoredAttributeElement } from '../elements/module';
import { DeclarationStatementElement, EnumDeclarationElement, TypeDeclarationElement, TypeSuffixElement } from '../elements/typing';
import { FunctionDeclarationElement, PropertyGetDeclarationElement, PropertyLetDeclarationElement, PropertySetDeclarationElement, SubDeclarationElement } from '../elements/procedure';
import { ExtensionConfiguration } from '../workspace';

export class CommonParserCapability {
    document: VbaClassDocument | VbaModuleDocument;
    protected _documentSettings?: ExtensionConfiguration;

    get documentSettings(): ExtensionConfiguration {
        if (!this._documentSettings) {
            throw new Error("Sad times");

        }
        return this._documentSettings;
    }

    constructor(document: VbaClassDocument | VbaModuleDocument) {
        this.document = document;
    }

    async ensureHasSettingsAsync() {
        this._documentSettings = await this.document.workspace.extensionConfiguration;
    }
}


export class VbaListener extends vbaListener {
    document: VbaClassDocument | VbaModuleDocument;
    protected documentSettings?: ExtensionConfiguration;
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
        this.documentSettings = await this.document.workspace.extensionConfiguration;
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

class PreIfElseBlockElement {
    ctx: PreIfElseBlockContext
    blocks: { block: PreBlockContext, levels: number[] }[] = []
    readonly levelBeforeEnter: number;

    get levelOnExit(): number {
        const maxs = this.blocks.map(x => Math.max(...x.levels));
        return Math.min(...maxs);
    }

    constructor (ctx: PreIfElseBlockContext, levelBeforeEnter: number) {
        this.ctx = ctx;
        this.levelBeforeEnter = levelBeforeEnter;
    }
}

type SelectCaseTracker = {
    statements: (CaseStatementContext | CaseDefaultStatementContext)[]
}


export class VbaFmtListener extends vbafmtListener {
    common: CommonParserCapability;
    indentOffsets: number[];

    private activeElements: ParserRuleContext[] = [];
    private continuedElements: ParserRuleContext[] = [];
    private selectCaseTrackers: SelectCaseTracker[] = [];
    private preCompilerElements: PreIfElseBlockElement[] = [];

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

    visitErrorNode(node: ErrorNode): void {
        const doc = this.common.document.textDocument;
        this.common.document.workspace.logger.error(`Couldn't parse ${node.toRange(doc)}\n${node.getText()}`)
    }

    getIndent(n: number): number {
        let result: number | undefined;

        for (let i = n; result === undefined && i >= 0; i--) {
            result = this.indentOffsets[i];
        }
        return (result ?? 0);
    }

    // Attributes are always zero indented.
    enterAttributeStatement = (ctx: AttributeStatementContext) => {
        const range = this.getCtxRange(ctx);
        const offset = this.endsWithLineEnding(ctx) ? 0 : 1

        // Set the line after the end to what is current and then set current to zero.
        this.setIndentAt(range.end.line + offset, this.getIndent(range.start.line), 'Shift for attribute');
        this.setIndentAt(range.start.line, 0, `${this.rangeText(ctx)} Attribute`)
        this.activeElements.push(ctx);
    }

    // Line ending treatments.
    enterContinuation = (ctx: ContinuationContext) => {
        const activeElement = this.activeElements.at(-1);
        const continuedElement = this.continuedElements.at(-1);
        if (activeElement) {
            // Don't indent if we're already indented.
            if (continuedElement === activeElement)
                return;
            
            // Flag this element as continued / indented.
            this.continuedElements.push(activeElement);

            // Indent the next line.
            const line = this.getCtxRange(ctx).start.line;
            this.offsetIndentAt(line + 1, 2, `${this.rangeText(ctx)} cont`);
        }
    }

    // Handle anything that has been continued.
    exitEveryRule(node: ParserRuleContext): void {
        // Remove from active elements if required.
        if (node === this.activeElements.at(-1))
            this.activeElements.pop();

        // Stop here if not continued.
        if (node !== this.continuedElements.at(-1))
            return;

        // Remove from continued and outdent next line.
        this.continuedElements.pop();
        const doc = this.common.document.textDocument;
        const offset = this.endsWithLineEnding(node) ? 0 : 1
        const line = node.toRange(doc).end.line + offset;
        this.offsetIndentAt(line, -2, `${this.rangeText(node)} cont`);
    }

    enterBasicStatement = (ctx: BasicStatementContext) =>
        this.activeElements.push(ctx);

    // enterMethodSignature = (ctx: MethodSignatureContext) =>
    //     this.activeElements.push(ctx);

    enterBlock = (ctx: BlockContext) =>
        this.indentOnEnter(ctx, 1);

    exitBlock = (ctx: BlockContext) =>
        this.outdentOnExit(ctx, -1);

    enterCaseDefaultStatement = (ctx: CaseDefaultStatementContext) => {
        this.outdentCaseStatement(ctx);
        this.indentCaseStatementBlock(ctx);
    }

    enterCaseStatement = (ctx: CaseStatementContext) => {
        this.outdentCaseStatement(ctx);
        this.indentCaseStatementBlock(ctx);
    }

    enterClassHeaderBlock = (ctx: ClassHeaderBlockContext) =>
        this.indentOnEnter(ctx, 1);

    exitClassHeaderBlock = (ctx: ClassHeaderBlockContext) =>
        this.outdentOnExit(ctx, -1);

    enterIndentAfterElement = (ctx: IndentAfterElementContext) =>
        this.activeElements.push(ctx);

    enterDocumentElement = (ctx: DocumentElementContext) =>
        this.activeElements.push(ctx);
    
    exitIndentAfterElement = (ctx: IndentAfterElementContext) => {
        const offset = this.endsWithLineEnding(ctx) ? 0 : 1
        const line = this.getCtxRange(ctx).end.line + offset;
        this.offsetIndentAt(line, 2, `${this.rangeText(ctx)}`);
    }

    enterLabelStatement? = (ctx: LabelStatementContext) => {
        // A label is a special case that will always be 0 indent
        // and will not affect the flow to the next line.
        const line = this.getCtxRange(ctx).start.line;
        this.indentOffsets[line + 1] = this.getIndent(line);
        this.indentOffsets[line] = 0;
    }
    
    enterMethodParameters = (ctx: MethodParametersContext) =>
        this.activeElements.push(ctx);

    enterOutdentBeforeElement = (ctx: OutdentBeforeElementContext) => {
        this.activeElements.push(ctx);
        const line = this.getCtxRange(ctx).start.line;
        this.offsetIndentAt(line, -2, `${this.rangeText(ctx)}`);
    }

    enterOutdentOnIndentAfterElement = (ctx: OutdentOnIndentAfterElementContext) => {
        this.activeElements.push(ctx);
        const line = this.getCtxRange(ctx).start.line;
        this.offsetIndentAt(line, -2, `${this.rangeText(ctx)}`);
    }

    exitOutdentOnIndentAfterElement = (ctx: OutdentOnIndentAfterElementContext) => {
        const offset = this.endsWithLineEnding(ctx) ? 0 : 1
        const line = this.getCtxRange(ctx).end.line + offset;
        this.offsetIndentAt(line, 2, `${this.rangeText(ctx)}`);
    }
        
    enterPreBlock = (ctx: PreBlockContext) => {
        const pce = this.preCompilerElements.at(-1);
        if (!pce) {
            this.common.document.workspace.logger.error(
                'PreBlockContext expected PreIfElseContext!');
            return;
        }
        const text = pce.blocks.length === 0 ? '#If' : '#ElseIf';
        this.indentOnEnter(ctx, 1, text);
        pce.blocks.push({
            block: ctx,
            levels: [pce.levelBeforeEnter + 1]
        })
    }

    exitPreBlock = (ctx: PreBlockContext) => {
        const pce = this.preCompilerElements.at(-1);
        if (!pce) return;
        const line = this.getCtxRange(ctx).end.line;
        this.setIndentAt(line, pce.levelBeforeEnter);
    }

    enterPreIfElseBlock = (ctx: PreIfElseBlockContext) => {
        const indentBeforeEnter = this.getIndent(this.getCtxRange(ctx).start.line);
        this.preCompilerElements.push(new PreIfElseBlockElement(ctx, indentBeforeEnter));
    }

    exitPreIfElseBlock = (ctx: PreIfElseBlockContext) => {
        const line = this.getCtxRange(ctx).end.line;
        const pce = this.preCompilerElements.pop();
        this.setIndentAt(line, pce?.levelBeforeEnter ?? 0, '#End If')
    }

    enterSelectCaseOpen = (_: SelectCaseOpenContext) =>
        this.selectCaseTrackers.push({statements: []});

    exitSelectCaseClose = (ctx: SelectCaseCloseContext) => {
        // Pop the tracker as it's no longer needed after this.
        const selectCaseElement = this.selectCaseTrackers.pop();
        if (!selectCaseElement) return;

        // Get the previous case statement and outdent if it had a line ending.
        const caseElement = selectCaseElement.statements.at(-1);
        if (!!caseElement && this.endsWithLineEnding(caseElement)) {
            this.outdentOnExit(ctx);
        }
    }

    private outdentCaseStatement(ctx: CaseStatementContext | CaseDefaultStatementContext): void {
        const logger = this.common.document.workspace.logger;
        const selectCaseElement = this.selectCaseTrackers.at(-1);
        if (!selectCaseElement) {
            logger.error(`Format parse error: got case statement while not tracking 'Select Case'`);
            return;
        }

        // Get the previous case statement and outdent if it had a line ending.
        const caseElement = selectCaseElement.statements.at(-1);
        if (!!caseElement && this.endsWithLineEnding(caseElement)) {
            const line = this.getCtxRange(ctx).start.line;
            this.offsetIndentAt(line, -2, `${this.rangeText(ctx)}`);
        }
    }

    private indentCaseStatementBlock(ctx: CaseStatementContext | CaseDefaultStatementContext): void {
        const selectCaseElement = this.selectCaseTrackers.at(-1);
        if (!selectCaseElement) return;

        // Track the case statement
        selectCaseElement.statements.push(ctx);
        this.activeElements.push(ctx);

        // Only indent if the case statement ends in a new line.
        if (this.endsWithLineEnding(ctx)) {
            const line = this.getCtxRange(ctx).end.line;
            this.offsetIndentAt(line, 2, `${this.rangeText(ctx)}`);
        }
    }

    private indentOnEnter(ctx: ParserRuleContext, indent?: number, text?: string): void {
        this.activeElements.push(ctx);
        const line = this.getCtxRange(ctx).start.line;
        const shift = indent ?? 2;
        const advice = text ? `${this.rangeText(ctx)} ${text}` : `${this.rangeText(ctx)}`;
        this.offsetIndentAt(line, shift, advice);
    }

    private outdentOnExit(ctx: ParserRuleContext, indent?: number): void {
        const line = this.getCtxRange(ctx).end.line;
        const shift = indent ?? -2;
        if (line > this.indentOffsets.length) {
            this.common.document.workspace.logger.error(`Format line ${line + 1} bang out of order in document of ${this.indentOffsets.length + 1} lines.`);
            return;
        }
        this.offsetIndentAt(line, shift, this.rangeText(ctx));
    }

    private offsetIndentAt(line: number, offset: number, text?: string): void {
        // Do nothing if there is no change.
        if (offset === 0)
            return;

        // Get the current and new indent levels.
        const currentIndent = this.getIndent(line);
        const preCompAdjustment = this.getPreCompAdjustment(currentIndent, offset);
        const newIndent = currentIndent + offset + preCompAdjustment;

        // Ensure we have a value GE zero and register safe value.
        const newIndentSafe = Math.max(newIndent, 0);
        this.indentOffsets[line] = newIndentSafe;
        this.preCompilerElements.at(-1)?.blocks.at(-1)?.levels.push(newIndentSafe);

        // Log the outcome.
        const num = (line + 1).toString().padStart(3, '0');
        const arrows = newIndent > 0 ? '>'.repeat(newIndent) : '<'.repeat(Math.abs(newIndent));
        this.common.document.workspace.logger.debug(`${num}: ${arrows} ${text}`)
    }

    /**
     * Adjusts a indent (+2) or an outdent (-2) by -1 or +1 respectively if required.
     * Returns 0 if the element is not the first indenting element in a pre compiler if else block.
     * @param currentIndent The current level of indentation.
     * @param newOffset The new offset to indicate direction.
     * @returns The amount the original offset should be adjusted by.
     */
    private getPreCompAdjustment(currentIndent: number, newOffset: number): number {
        // If current indent is odd, assume we're just inside a #[else]if block.
        // -1 to offset an indent, 0 to leave it alone.
        const offset = (currentIndent.isOdd() && newOffset.isEven()) ? 1 : 0;
        
        // Switch the direction if we have an outdent value.
        const offsetToggle = offset > 0 ? -1 : 1;
        return offset * offsetToggle;
    }

    private setIndentAt(line: number, offset: number, text?: string): void {
        this.indentOffsets[line] = offset;
        const num = (line + 1).toString().padStart(3, '0');
        const arrows = '>'.repeat(offset);
        this.common.document.workspace.logger.debug(`${num}: ${arrows} ${text}`)
    }

    private rangeText(ctx: ParserRuleContext): string {
        const r = this.getCtxRange(ctx);
        return `[${r.start.line + 1}, ${r.start.character}, ${r.end.line + 1}, ${r.end.character}]`
    }

    private getCtxRange(ctx: ParserRuleContext): Range {
        return ctx.toRange(this.common.document.textDocument);
    }

    /**
     * Checks if the context spills over into the next line.
     * This is useful to prevent indentation of the wrong line.
     * @param ctx A ParserRuleContext hopefully.
     * @returns True if the last child is a LineEndingContext.
     */
    private endsWithLineEnding(ctx: ParserRuleContext): boolean {
        // Ensure we have a context.
        if (!(ctx instanceof ParserRuleContext))
            return false;

        // Check last child is a line ending.
        const child = ctx.children.at(-1);
        if (!child)
            return false;

        // Line endings don't have structures so no need to check children.
        if (child instanceof LineEndingContext)
            return true;

        // Run it again!
        if (child.getChildCount() > 0)
            return this.endsWithLineEnding(child as ParserRuleContext);

        // Not a line ending and no more children.
        return false;
    }
}