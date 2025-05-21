// Core
import { TextDocument } from "vscode-languageserver-textdocument";

// Antlr
import { ParserRuleContext } from "antlr4ng";
import {
    AmbiguousIdentifierContext,
    DictionaryAccessExpressionContext,
    IndexExpressionContext,
    LExpressionContext,
    MemberAccessExpressionContext,
    PositionalParamContext,
    SimpleNameExpressionContext,
    UnrestrictedNameContext,
    WithMemberAccessExpressionContext,
    WithStatementContext
} from "../../antlr/out/vbaParser";

// Project
import { BaseRuleSyntaxElement } from "./base";
import { AssignmentType, IdentifierCapability, ItemType, ScopeItemCapability } from "../../capabilities/capabilities";


export class WithStatementElement extends BaseRuleSyntaxElement<WithStatementContext> {
    nameExpressionElement?: NameExpressionElement;

    get nameStack(): ParserRuleContext[] {
        return this.nameExpressionElement?.nameStack ?? [];
    }

    constructor(ctx: WithStatementContext, doc: TextDocument) {
        super(ctx, doc);
    }
}


export type NameExpressionContext = LExpressionContext
    | SimpleNameExpressionContext
    | MemberAccessExpressionContext
    | PositionalParamContext
    | IndexExpressionContext
    | WithMemberAccessExpressionContext
    | DictionaryAccessExpressionContext;

export class NameExpressionElement extends BaseRuleSyntaxElement<NameExpressionContext> {
    scopeItemCapability: ScopeItemCapability;
    identifierCapability: IdentifierCapability;

    nameContexts: (SimpleNameExpressionContext | UnrestrictedNameContext | AmbiguousIdentifierContext)[] = [];
    withStatementElement?: WithStatementElement;

    get hasNames(): boolean {
        return this.nameContexts.length > 0;
    }

    get nameStack(): ParserRuleContext[] {
        return [(this.withStatementElement?.nameStack ?? []), this.nameContexts].flat();
    }

    get fqName(): string {
        return this.nameStack.map(x => x.getText()).join('.');
    }

    constructor(ctx: NameExpressionContext, doc: TextDocument) {
        super(ctx, doc);
        this.identifierCapability = new IdentifierCapability(this, () => this.nameStack.at(-1));
        this.scopeItemCapability = new ScopeItemCapability(this, ItemType.REFERENCE, AssignmentType.GET);
    }

    setAsCallType = () => this.scopeItemCapability.assignmentType = AssignmentType.CALL;
    setAsLetType = () => this.scopeItemCapability.assignmentType = AssignmentType.LET;
    setAsSetType = () => this.scopeItemCapability.assignmentType = AssignmentType.SET;

    addName = (ctx: SimpleNameExpressionContext | UnrestrictedNameContext | AmbiguousIdentifierContext) => {
        this.nameContexts.push(ctx);
    };
}