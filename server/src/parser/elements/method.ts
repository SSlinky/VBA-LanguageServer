import { TypeContext } from './vbLang';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BaseElement, IdentifierElement } from './base';
import { Hover, MarkupContent, MarkupKind, SymbolKind } from 'vscode-languageserver';
import { AsTypeClauseContext, DocstringStmtContext, MethodSignatureStmtContext, MethodStmtContext, PropertySignatureStmtContext, PropertyStmtContext } from '../../antlr/out/vbaParser';


export class MethodElement extends BaseElement {
    readonly name = "MethodElement";
    returnType: TypeContext | undefined;
    hasPrivateModifier = false;

    public get signature(): MethodSignatureStmtContext | PropertySignatureStmtContext | undefined {
        if (this.context instanceof MethodStmtContext)
            return this.context.methodSignatureStmt();
        if (this.context instanceof PropertyStmtContext) { return this.context.propertySignatureStmt(); }
    }

    constructor(ctx: MethodStmtContext | PropertyStmtContext, doc: TextDocument) {
        super(ctx, doc);
        this.returnType = this.getReturnType(doc);
        if (ctx instanceof MethodStmtContext) {
            this.setUpMethod(ctx);
        } else {
            this.setUpProperty(ctx);
        }
    }

    private setUpMethod(ctx: MethodStmtContext) {
        this.hasPrivateModifier = !!(ctx.methodSignatureStmt().visibility()?.PRIVATE);
        this.symbolKind = ctx.methodSignatureStmt().FUNCTION() ?
            SymbolKind.Function : SymbolKind.Method;
    }

    private setUpProperty(ctx: PropertyStmtContext) {
        this.hasPrivateModifier = !!(ctx.propertySignatureStmt().visibility()?.PRIVATE);
        this.symbolKind = SymbolKind.Property;
    }

    private getReturnType(doc: TextDocument): TypeContext | undefined {
        const asTypeCtx = this.getTypeContext();

        if (asTypeCtx) {
            const t = asTypeCtx.type_();
            const typeCtx = t.baseType() ?? t.complexType();
            if (typeCtx) {
                return new TypeContext(typeCtx, doc);
            }
        }
    }

    private getTypeContext(): AsTypeClauseContext | undefined {
        return this.getSignatureContext().asTypeClause();
    }

    protected setIdentifierFromDoc(doc: TextDocument): void {
        if (this.isIdentifiable(this.getSignatureContext())) {
            const identCtx = this.getSignatureContext().ambiguousIdentifier();
            if (identCtx) {
                this.identifier = new IdentifierElement(identCtx, doc);
            }
        }
    }

    private getSignatureContext(): MethodSignatureStmtContext | PropertySignatureStmtContext {
        if (this.context instanceof MethodStmtContext) {
            return this.context.methodSignatureStmt();
        }
        if (this.context instanceof PropertyStmtContext) {
            return this.context.propertySignatureStmt();
        }
        throw new Error("Method has no signature.");
    }

    hover = (): Hover => {
        return {
            contents: this.getHoverText(),
            range: this.range
        };
    };

    getHoverText(): MarkupContent {
        const lineBreak = '---\n';
        const signature = this.signature;
        const docs = this.getDocstringContent();

        const result = [
            this.parent?.namespace ?? this.namespace,
            `\`\`\`vba\n${signature?.text}\n\`\`\`\n`,
            lineBreak,
            docs
        ];

        return {
            kind: MarkupKind.Markdown,
            value: result.join('\n')
        };
    }

    private getDocstringContent(): string | undefined {
        const docstring = this.children.find(x => x.name == "DocstringElement");
        if (docstring instanceof DocstringElement)
            return docstring.toMarkupContentValue();
    }


}

export class DocstringElement extends BaseElement {
    readonly name = "DocstringElement";
    constructor(ctx: DocstringStmtContext, doc: TextDocument) {
        super(ctx, doc);
    }

    toMarkupContentValue(): string {
        let lines = this.text.split('\n');
        lines = lines.map(str => str.replace(/^[']\s{0,3}/, ''));
        lines = lines.map(str => str.replace(/\s/, '&nbsp;'));
        return lines.join('  \n');
    }
}
