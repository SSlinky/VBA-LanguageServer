// Core
import { TextDocument } from "vscode-languageserver-textdocument";

// Antlr
import { AttributeStatementContext } from "../../antlr/out/vbaParser";

// Project
import { BaseRuleSyntaxElement } from "./base";
import { IdentifierCapability, ScopeItemCapability, ScopeType } from "../../capabilities/capabilities";


export class AttributeElement extends BaseRuleSyntaxElement<AttributeStatementContext> {
    identifierCapability: IdentifierCapability;
    scopeItemCapability: ScopeItemCapability;

    constructor(ctx: AttributeStatementContext, doc: TextDocument) {
        super(ctx, doc);

        this.identifierCapability = new IdentifierCapability(this, () => ctx.ambiguousIdentifier());
        this.scopeItemCapability = new ScopeItemCapability(this, ScopeType.ATTRIBUTE);
    }
}