import { ClassModuleDirectiveElementContext, CommonOptionDirectiveContext, NameAttrContext, ProceduralModuleContext, ProceduralModuleDirectiveElementContext, ProcedureBodyContext, ProcedureDeclarationContext, RemStatementContext, StartRuleContext, SubroutineDeclarationContext } from "../../antlr/out/vbaParser";


type VisitResult = Promise<void>
import { CancellationToken } from 'vscode-languageserver';
import { vbaVisitor } from '../../antlr/out/vbaVisitor';
import { EnumDeclarationContext, UntypedNameContext } from '../../antlr/out/vbaParser';
import { Logger } from '../../injection/interface';
import { Services } from '../../injection/services';
import { ParserRuleContext, ParseTree } from 'antlr4ng';
import { VbaClassDocument, VbaModuleDocument } from '../document';
import { BaseRuleSyntaxElement } from '../elements/base';
import { NameElement } from '../elements/typing';
import { IdentifierCapability } from '../../capabilities/capabilities';


export class VbaVisitor extends vbaVisitor<Promise<BaseRuleSyntaxElement<ParserRuleContext> | void>> {
    private _logger?: Logger;
    private nodesProcessed = 0;

    get logger(): Logger {
        if (!this._logger) {
            this._logger = Services.logger;
        }
        return this._logger;
    }

    constructor(private cancellationToken: CancellationToken, private document: VbaClassDocument | VbaModuleDocument) {
        super();
        this.cancellationToken.onCancellationRequested((e) => {
            this.logger.debug(`Cancellation requested at ${this.nodesProcessed} nodes processed.`);
        });
    }

    visit = async (tree: ParseTree) => {
        if (this.cancellationToken.isCancellationRequested) {
            return;
        }
        this.nodesProcessed += 1;
        await this.yieldThread();
        const result = await super.visit(tree);
        if (result) {
            return result;
        }
        // await this.visitChildren(tree);
    };

    async visitChildren(node: ParseTree) {
        for (let i = 0; i < node.getChildCount(); i++) {
            const child = node.getChild(i);
            if (child) await this.visit(child);
        }
    }

    visitStartRule = async (ctx: StartRuleContext) => {
        if (this.cancellationToken.isCancellationRequested) {
            return;
        }
        await this.yieldThread();
        this.logger.debug(`Visited visitStartRule`);
        await this.visit(ctx.module());
    };

    visitEnumDeclaration = async (ctx: EnumDeclarationContext) => {
        const nameElement = await this.visit(ctx.untypedName()) as NameElement;
        const identifier = new IdentifierCapability({
            element: nameElement,
            getNameContext: () => nameElement.context.rule
        });
    };

    visitUntypedName = async (ctx: UntypedNameContext) => {
        return new NameElement(ctx, this.document.textDocument);
    };
}

export class VbaDeclarationVisitor extends vbaVisitor<void> {
    private logger = Services.logger;
    private scopeLevel = 0;

    override visitChildren(node: ParseTree): void {
        for (let i = 0; i < node.getChildCount(); i++) {
            const child = node.getChild(i);
            console.log(`child: ${child?.toStringTree() ?? 'NO CHILD OF MINE'}`);
            child?.accept(this);
        }
    }

    override visitStartRule = (ctx: StartRuleContext) => {
        this.logger.debug("Visting start rule");
        const module = ctx.module().proceduralModule();
        module?.accept(this);
    };

    override visitProceduralModule = (ctx: ProceduralModuleContext) => {
        // Get the name of the module.
        const attributes = ctx.proceduralModuleHeader().proceduralModuleAttr();
        for (const attr of attributes) {
            if (attr instanceof NameAttrContext) {
                this.logger.log(`Entering scope ${attr.STRINGLITERAL.toString().stripQuotes()}`);
            }
        }

        // Parse the elements.
        const elements = ctx.proceduralModuleBody()
            .proceduralModuleCode()
            .proceduralModuleCodeElement()
            .map(e => e.commonModuleCodeElement());

        let canUseDirective = true;
        let canDeclareEnum = true;
        for (const element of elements) {
            if (element.remStatement()) {
                continue;
            }

            if (element.commonOptionDirective()) {
                if (!canUseDirective) {
                    this.logger.error(`Directive not at top of module ${element.getText()}`);
                    continue;
                }

                if (element.commonOptionDirective()?.optionExplicitDirective()) {
                    this.logger.debug('Option Explicit');
                }
            }

            if (element.proceduralModuleDirectiveElement()) {
                continue;
            }

            if (element.classModuleDirectiveElement()) {
                this.logger.error(`Directive not valid in module ${element.getText()}`);
                continue;
            }

            canUseDirective = false;

            if (element.procedureDeclaration()) {
                canDeclareEnum = false;
            }

            this.visitChildren(element);
        }
    };

    override visitSubroutineDeclaration = (ctx: SubroutineDeclarationContext) => {
        const name = ctx.subroutineName()?.getText() ?? 'anonymous sub';
        const visibility = ctx.procedureScope()?.GLOBAL() || ctx.procedureScope()?.PUBLIC()
            ? 'public' : 'private';
        this.logger.debug(`Entering ${visibility} scope ${name}: void`, this.scopeLevel);
        this.scopeLevel += 1;
        ctx.procedureBody()?.statementBlock().accept(this);
        this.scopeLevel -= 1;
        this.logger.debug(`Exiting ${name}`, this.scopeLevel);
    };

    override visitProcedureBody = (ctx: ProcedureBodyContext) => {

    };
}

class VbaVisitor extends vbaVisitor<VisitResult> {
    private logger = Services.logger;

    constructor(private token: CancellationToken) {
        super();

    }


    protected override defaultResult = (): VisitResult =>
        Promise.resolve();

    protected override aggregateResult = (aggregate: VisitResult, next: VisitResult) =>
        aggregate.then(() => next);

    override async visitChildren(node: ParseTree): VisitResult {
        let result = this.defaultResult();
        for (let i = 0; i < node.getChildCount(); i++) {
            // Break if we have no more work to do.
            if (this.token.isCancellationRequested) {
                break;
            }

            // Process the child tree.
            const child = node.getChild(i)!;
            const childResult = await child.accept(this);
            if (childResult) {
                result = this.aggregateResult(result, childResult);
            }
        }

        return result;
    }
}