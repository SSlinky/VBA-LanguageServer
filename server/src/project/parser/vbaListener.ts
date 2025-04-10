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
    EnumMemberContext,
    FunctionDeclarationContext,
    GlobalVariableDeclarationContext,
    IfStatementContext,
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
import { DuplicateOperatorElement, IfElseBlock as IfStatementElement, WhileLoopElement } from '../elements/flow';
import { VbaClassDocument, VbaModuleDocument } from '../document';
import { ClassElement, ModuleElement, ModuleIgnoredAttributeElement } from '../elements/module';
import { DeclarationStatementElement, EnumDeclarationElement, EnumMemberDeclarationElement, TypeDeclarationElement, TypeSuffixElement } from '../elements/typing';
import { FunctionDeclarationElement, PropertyGetDeclarationElement, PropertyLetDeclarationElement, PropertySetDeclarationElement, SubDeclarationElement } from '../elements/procedure';
import { ExtensionConfiguration } from '../workspace';
import { Services } from '../../injection/services';
import { ErrorRuleElement } from '../elements/generic';

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
        this._documentSettings = await Services.server.clientConfiguration;
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
        this.documentSettings = await Services.server.clientConfiguration;
    }

    exitEveryRule(node: ParserRuleContext): void {
        this.document.exitContext(node);
    }

    enterAnyOperator = (ctx: AnyOperatorContext) => {
        const element = new DuplicateOperatorElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    enterEnumDeclaration = (ctx: EnumDeclarationContext) => {
        const element = new EnumDeclarationElement(ctx, this.document.textDocument, this.isAfterMethodDeclaration);
        this.document.registerElement(element);
    };

    enterEnumMember = (ctx: EnumMemberContext) => {
        const element = new EnumMemberDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    enterClassModule = (ctx: ClassModuleContext) => {
        const element = new ClassElement(ctx, this.document.textDocument, this.documentSettings ?? { doWarnOptionExplicitMissing: true });
        this.document.registerElement(element);
    };

    enterIfStatement = (ctx: IfStatementContext) =>
        this.document.registerElement(new IfStatementElement(ctx, this.document.textDocument));

    enterIgnoredClassAttr = (ctx: IgnoredClassAttrContext) => this.registerIgnoredAttribute(ctx);
    enterIgnoredProceduralAttr = (ctx: IgnoredProceduralAttrContext) => this.registerIgnoredAttribute(ctx);
    private registerIgnoredAttribute(ctx: IgnoredClassAttrContext | IgnoredProceduralAttrContext) {
        this.document.registerElement(new ModuleIgnoredAttributeElement(ctx, this.document.textDocument));
    }

    enterProceduralModule = (ctx: ProceduralModuleContext) => {
        const element = new ModuleElement(ctx, this.document.textDocument, this.documentSettings ?? { doWarnOptionExplicitMissing: true });
        this.document.registerElement(element);
    };

    // Handles exiting of a sub, func, or property.
    exitProcedureDeclaration = (ctx: ProcedureDeclarationContext) => {
        this.isAfterMethodDeclaration = true;
    };

    enterPropertyGetDeclaration = (ctx: PropertyGetDeclarationContext) => {
        const element = new PropertyGetDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    enterPropertySetDeclaration = (ctx: PropertySetDeclarationContext) => {
        const element = ctx.LET()
            ? new PropertyLetDeclarationElement(ctx, this.document.textDocument)
            : new PropertySetDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    enterSubroutineDeclaration = (ctx: SubroutineDeclarationContext) => {
        const element = new SubDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    enterFunctionDeclaration = (ctx: FunctionDeclarationContext) => {
        const element = new FunctionDeclarationElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    enterPublicTypeDeclaration = (ctx: PublicTypeDeclarationContext) => this.enterTypeDeclaration(ctx, true);
    enterPrivateTypeDeclaration = (ctx: PrivateTypeDeclarationContext) => this.enterTypeDeclaration(ctx, false);
    private enterTypeDeclaration = (ctx: PublicTypeDeclarationContext | PrivateTypeDeclarationContext, isPrivate: boolean) => {
        const element = new TypeDeclarationElement(ctx, this.document.textDocument, isPrivate);
        this.document.registerElement(element);
    };

    enterTypeSuffix = (ctx: TypeSuffixContext) =>
        this.document.registerElement(new TypeSuffixElement(ctx, this.document.textDocument));

    // Variables
    enterPublicConstDeclaration = (ctx: PublicConstDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterPrivateConstDeclaration = (ctx: PrivateConstDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterPublicVariableDeclaration = (ctx: PublicVariableDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterGlobalVariableDeclaration = (ctx: GlobalVariableDeclarationContext) => this.enterVariableDeclaration(ctx);
    enterPrivateVariableDeclaration = (ctx: PrivateVariableDeclarationContext) => this.enterVariableDeclaration(ctx);
    private enterVariableDeclaration = (ctx: PublicConstDeclarationContext | PrivateConstDeclarationContext | PublicVariableDeclarationContext | GlobalVariableDeclarationContext | PrivateVariableDeclarationContext) => {
        const element = DeclarationStatementElement.create(ctx, this.document.textDocument);
        element.declarations.forEach(x => this.document.registerElement(x));
    };

    enterUnexpectedEndOfLine = (ctx: UnexpectedEndOfLineContext) => {
        const element = new UnexpectedEndOfLineElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    enterWhileStatement = (ctx: WhileStatementContext) => {
        const element = new WhileLoopElement(ctx, this.document.textDocument);
        this.document.registerElement(element);
    };

    visitErrorNode(node: ErrorNode) {
        this.document.registerElement(new ErrorRuleElement(node, this.document.textDocument));
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
    };
}

class PreIfElseBlockElement {
    ctx: PreIfElseBlockContext;
    blocks: { block: PreBlockContext, levels: number[] }[] = [];
    readonly levelBeforeEnter: number;

    get levelOnExit(): number {
        const lastBlocks = this.blocks
            .map(x => x.levels.at(-1))
            .filter((x) => !(x === undefined));
        const maxIndent = Math.max(...lastBlocks);
        return maxIndent.isOdd() ? maxIndent - 1 : maxIndent;
    }

    get levelOnExit2(): number {
        const maxs = this.blocks.map(x => Math.max(...x.levels));
        return Math.min(...maxs);
    }

    constructor(ctx: PreIfElseBlockContext, levelBeforeEnter: number) {
        this.ctx = ctx;
        this.levelBeforeEnter = levelBeforeEnter;
    }
}

type SelectCaseTracker = {
    statements: (CaseStatementContext | CaseDefaultStatementContext)[]
}

type AdjustIndentParams = {
    line?: number,
    offset?: number,
    text?: string,
    context?: ParserRuleContext,
    trackMinimumIndent?: boolean
}


export class VbaFmtListener extends vbafmtListener {
    common: CommonParserCapability;
    indentationKeys: number[];

    private activeElements: ParserRuleContext[] = [];
    private continuedElements: ParserRuleContext[] = [];
    private selectCaseTrackers: SelectCaseTracker[] = [];
    private preCompilerElements: PreIfElseBlockElement[] = [];
    private minumumIndent: number = 0;

    constructor(document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.common = new CommonParserCapability(document);
        this.indentationKeys = new Array(document.textDocument.lineCount);
    }

    static async createAsync(document: VbaClassDocument | VbaModuleDocument): Promise<VbaFmtListener> {
        const result = new VbaFmtListener(document);
        await result.common.ensureHasSettingsAsync();
        return result;
    }

    visitErrorNode(node: ErrorNode): void {
        const doc = this.common.document.textDocument;
        Services.logger.error(`Couldn't parse ${node.toRange(doc)}\n${node.getText()}`);
    }

    /**
     * Searches the indentation key markers to return the indentation at the given line.
     * @param n the zero-based document line number.
     * @returns The indentation at the line.
     */
    getIndent(n: number): number {
        let result: number | undefined;

        for (let i = n; result === undefined && i >= 0; i--) {
            result = this.indentationKeys[i];
        }
        return (result ?? 0);
    }

    // Attributes are always zero indented.
    enterAttributeStatement = (ctx: AttributeStatementContext) => {
        const range = this.getCtxRange(ctx);
        const offset = ctx.endsWithLineEnding ? 0 : 1;

        // Set the line after the end to what is current and then set current to zero.
        this.setIndentAt({
            line: range.end.line + offset,
            offset: this.getIndent(range.start.line),
            text: 'Shift for attribute'
        });

        this.setIndentAt({
            line: range.start.line,
            offset: 0,
            text: `${this.rangeText(ctx)} Attribute`
        });
        this.activeElements.push(ctx);
    };

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
            this.modifyIndentAt({
                line: line + 1,
                offset: 2,
                text: `${this.rangeText(ctx)} cont`
            });
        }
    };

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
        const offset = node.endsWithLineEnding ? 0 : 1;
        const line = node.toRange(doc).end.line + offset;
        this.modifyIndentAt({
            line: line,
            offset: -2,
            text: `${this.rangeText(node)} cont`
        });
    }

    enterBasicStatement = (ctx: BasicStatementContext) =>
        this.activeElements.push(ctx);

    enterBlock = (ctx: BlockContext) =>
        this.indentOnEnter({ context: ctx });

    exitBlock = (ctx: BlockContext) =>
        this.outdentAfterExit({ context: ctx });

    enterCaseDefaultStatement = (ctx: CaseDefaultStatementContext) => {
        this.outdentCaseStatementBlock(ctx);
        this.indentCaseStatementBlock(ctx);
    };

    enterCaseStatement = (ctx: CaseStatementContext) => {
        this.outdentCaseStatementBlock(ctx);
        this.indentCaseStatementBlock(ctx);
    };

    enterClassHeaderBlock = (ctx: ClassHeaderBlockContext) =>
        this.indentOnEnter({ context: ctx, offset: 1 });

    exitClassHeaderBlock = (ctx: ClassHeaderBlockContext) =>
        this.outdentAfterExit({ context: ctx, offset: -1 });

    enterIndentAfterElement = (ctx: IndentAfterElementContext) =>
        this.activeElements.push(ctx);

    enterDocumentElement = (ctx: DocumentElementContext) =>
        this.activeElements.push(ctx);

    exitIndentAfterElement = (ctx: IndentAfterElementContext) => {
        const offset = ctx.endsWithLineEnding ? 0 : 1;
        const line = this.getCtxRange(ctx).end.line + offset;
        this.modifyIndentAt({
            line: line,
            offset: 2,
            text: `${this.rangeText(ctx)}`
        });
    };

    enterLabelStatement? = (ctx: LabelStatementContext) => {
        // A label is a special case that will always be 0 indent
        // and will not affect the flow to the next line.
        const line = this.getCtxRange(ctx).start.line;
        this.indentationKeys[line + 1] = this.getIndent(line);
        this.indentationKeys[line] = 0;
    };

    enterMethodParameters = (ctx: MethodParametersContext) =>
        this.activeElements.push(ctx);

    enterOutdentBeforeElement = (ctx: OutdentBeforeElementContext) => {
        this.activeElements.push(ctx);
        this.modifyIndentAt({
            line: this.getCtxRange(ctx).start.line,
            offset: -2,
            text: `${this.rangeText(ctx)}`
        });
    };

    // Enter outdent on enter / indent after exit element.
    enterOutdentOnIndentAfterElement = (ctx: OutdentOnIndentAfterElementContext) => {
        this.activeElements.push(ctx);
        const line = this.getCtxRange(ctx).start.line;
        this.modifyIndentAt({
            line: line,
            offset: -2,
            text: `${this.rangeText(ctx)}`
        });
    };

    // Exit outdent on enter / indent after exit element.
    exitOutdentOnIndentAfterElement = (ctx: OutdentOnIndentAfterElementContext) => {
        // Offset the line to indent based on whether the element ends with a new line character.
        const offset = ctx.endsWithLineEnding ? 0 : 1;
        const line = this.getCtxRange(ctx).end.line + offset;
        this.modifyIndentAt({
            line: line,
            offset: 2,
            text: `${this.rangeText(ctx)}`
        });
    };

    enterPreBlock = (ctx: PreBlockContext) => {
        // Get and ensure we have a preCompilerElement
        const preCompilerElement = this.preCompilerElements.at(-1);
        if (!preCompilerElement) {
            Services.logger.error('PreBlockContext expected PreIfElseContext!');
            return;
        }

        // Set the indentation level.
        const text = preCompilerElement.blocks.length === 0 ? '#If' : '#ElseIf';
        this.indentOnEnter({
            context: ctx,
            offset: 1,
            text: text,
            trackMinimumIndent: true
        });

        // Track this condition block on the preCompilerElement.
        preCompilerElement.blocks.push({
            block: ctx,
            levels: [preCompilerElement.levelBeforeEnter + 1]
        });
    };

    exitPreBlock = (ctx: PreBlockContext) =>
        this.setIndentAt({
            line: this.getCtxRange(ctx).end.line,
            offset: this.preCompilerElements.at(-1)?.levelBeforeEnter ?? 0,
            trackMinimumIndent: true
        });

    enterPreIfElseBlock = (ctx: PreIfElseBlockContext) => {
        const indentBeforeEnter = this.getIndent(this.getCtxRange(ctx).start.line);
        this.preCompilerElements.push(new PreIfElseBlockElement(ctx, indentBeforeEnter));
    };

    exitPreIfElseBlock = (ctx: PreIfElseBlockContext) =>
        this.setIndentAt({
            line: this.getCtxRange(ctx).end.line,
            offset: (this.preCompilerElements.pop())?.levelOnExit ?? 0,
            text: '#End If'
        });

    enterSelectCaseOpen = (_: SelectCaseOpenContext) =>
        this.selectCaseTrackers.push({ statements: [] });

    exitSelectCaseClose = (ctx: SelectCaseCloseContext) => {
        // Pop the tracker as it's no longer needed after this.
        const selectCaseElement = this.selectCaseTrackers.pop();
        if (!selectCaseElement) return;

        // Get the previous case statement and outdent if it had a line ending.
        const caseElement = selectCaseElement.statements.at(-1);
        if (!!caseElement && caseElement.endsWithLineEnding) {
            this.outdentAfterExit({ context: ctx });
        }
    };

    /**
     * Special outdent handler for case statements where the previous case was a block type.
     */
    private outdentCaseStatementBlock(ctx: CaseStatementContext | CaseDefaultStatementContext): void {
        const logger = Services.logger;
        const selectCaseElement = this.selectCaseTrackers.at(-1);
        if (!selectCaseElement) {
            logger.error(`Format parse error: got case statement while not tracking 'Select Case'`);
            return;
        }

        // Get the previous case statement and outdent if it had a line ending.
        const caseElement = selectCaseElement.statements.at(-1);
        if (!!caseElement && caseElement.endsWithLineEnding) {
            this.modifyIndentAt({
                line: this.getCtxRange(ctx).start.line,
                offset: -2,
                text: `${this.rangeText(ctx)}`
            });
        }
    }

    /**
     * Special indent handler for case blocks within a Select Case block.
     */
    private indentCaseStatementBlock(ctx: CaseStatementContext | CaseDefaultStatementContext): void {
        const selectCaseElement = this.selectCaseTrackers.at(-1);
        if (!selectCaseElement) return;

        // Track the case statement
        selectCaseElement.statements.push(ctx);
        this.activeElements.push(ctx);

        // Only indent if the case statement ends in a new line.
        // A new line indicates the case is a block type, not single line.
        if (ctx.endsWithLineEnding) {
            this.modifyIndentAt({
                line: this.getCtxRange(ctx).end.line,
                offset: 2,
                text: `${this.rangeText(ctx)}`
            });
        }
    }

    /**
     * Indents the documents after an element.
     */
    private indentOnEnter(params: AdjustIndentParams): void {
        if (!params.context) {
            throw new Error('VbaFmtListener.indentOnEnter expected ctx');
        }

        // Track the element as active.
        this.activeElements.push(params.context);

        // Modify the indentation at this line.
        const result = this.modifyIndentAt({
            line: this.getCtxRange(params.context).start.line,
            offset: params.offset ?? 2,
            text: params.text ? `${this.rangeText(params.context)} ${params.text}` : `${this.rangeText(params.context)}`,
            trackMinimumIndent: params.trackMinimumIndent
        });

        // Set the minimum indent level if required.
        if (!(result === undefined) && params.trackMinimumIndent) {
            this.minumumIndent = result;
        }
    }

    /**
     * Outdents the documents after an element.
     */
    private outdentAfterExit(params: AdjustIndentParams): void {
        if (!params.context) {
            throw new Error('VbaFmtListener.outdentAfterExit expected ctx');
        }

        // Modify the indentation at this line.
        const result = this.modifyIndentAt({
            line: this.getCtxRange(params.context).end.line,
            offset: params.offset ?? -2,
            text: this.rangeText(params.context)
        });

        // Set the minimum indent level if required.
        if (!(result === undefined) && params.trackMinimumIndent) {
            this.minumumIndent = result;
        }
    }

    /**
     * Modifies the current indent at the line. This allows elements to
     * in/outdent by an amount without requiring knowledge of the current level.
     * @returns The adjusted indentation amount.
     */
    private modifyIndentAt(params: AdjustIndentParams): number | undefined {
        if (params.line === undefined) {
            throw new Error('VbaFmtListener.offsetIndentAt expected ctx');
        }

        if (params.offset === undefined) {
            throw new Error('VbaFmtListener.offsetIndentAt expected ctx');
        }

        // Do nothing if there is no change.
        if (params.offset === 0)
            return;

        // Get the current and new indent levels.
        const currentIndent = this.getIndent(params.line);
        const preCompAdjustment = this.getPreCompAdjustment(currentIndent, params.offset);
        const newIndent = currentIndent + params.offset + preCompAdjustment;

        // Set the new minimum indent if required.
        if (params.trackMinimumIndent) {
            this.minumumIndent = Math.max(0, newIndent);
        }

        // Ensure we have a value GE zero and register safe value.
        const newIndentSafe = Math.max(newIndent, this.minumumIndent);
        this.indentationKeys[params.line] = newIndentSafe;

        // Track the indent level if this isn't a precompile element,
        // i.e., not adjusting the minimum indentation level.
        if (!params.trackMinimumIndent) {
            const currentPceBlock = this.preCompilerElements.at(-1)?.blocks.at(-1);
            currentPceBlock?.levels.push(newIndentSafe);
        }

        // Log the outcome.
        const num = (params.line + 1).toString().padStart(3, '0');
        const arrows = newIndent > 0 ? '>'.repeat(newIndent) : '<'.repeat(Math.abs(newIndent));
        Services.logger.debug(`${num}: ${arrows} ${params.text}`);
        return newIndentSafe;
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

    /**
     * Sets the indentation at the line. This allows elements to specify their
     * indentation amount without consideration of document flow.
     */
    private setIndentAt(params: AdjustIndentParams): void {
        if (params.line === undefined) {
            throw new Error('VbaFmtListener.setIndentAt expected ctx');
        }

        if (params.offset === undefined) {
            throw new Error('VbaFmtListener.setIndentAt expected ctx');
        }

        this.indentationKeys[params.line] = params.offset;
        const num = (params.line + 1).toString().padStart(3, '0');
        const arrows = '>'.repeat(params.offset);
        Services.logger.debug(`${num}: ${arrows} ${params.text}`);
        if (params.trackMinimumIndent) {
            this.minumumIndent = params.offset;
        }
    }

    /**
     * @returns A formatted string representing the range of the context.
     */
    private rangeText(ctx: ParserRuleContext): string {
        const r = this.getCtxRange(ctx);
        return `[${r.start.line + 1}, ${r.start.character}, ${r.end.line + 1}, ${r.end.character}]`;
    }

    private getCtxRange(ctx: ParserRuleContext): Range {
        return ctx.toRange(this.common.document.textDocument);
    }
}