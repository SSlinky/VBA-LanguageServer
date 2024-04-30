import { TextDocument } from 'vscode-languageserver-textdocument';
import { SemanticToken } from '../../capabilities/vbaSemanticTokens';
import { vbaTypeToSymbolConverter } from '../../utils/converters';
import { BaseElement, IdentifierElement, SyntaxElement } from './base';
import { ImplicitCallElement, TypeContext } from './vbLang';
import { Hover, SemanticTokenModifiers, SemanticTokenTypes, SymbolKind } from 'vscode-languageserver';

import { ConstStmtContext, ConstSubStmtContext, ImplicitCallStmt_InBlockContext, ImplicitCallStmt_InStmtContext, LetStmtContext, LiteralContext, SetStmtContext, ValueStmtContext, VariableStmtContext, VariableSubStmtContext, VsLiteralContext } from '../../antlr/out/vbaParser';
import { MethodElement } from './method';

interface IsVarOrCall {
    setDeclaredType(e: MethodElement): void;
}

export enum Type {
    'string' = 0,
    'oct',
    'hex',
    'short',
    'double',
    'integer',
    'date',
    'boolean',
    'object',
    'variant'
}

/**
 * Represents a variable declaration either explicit or via a method signature.
 */
export class VariableStatementElement extends BaseElement implements IsVarOrCall {
    readonly name = "VariableStatementElement";
    variableList: VariableDeclarationElement[] = [];
    hasPrivateModifier = false;
    foldingRange = () => undefined;
    declaration: MethodElement | undefined;

    constructor(ctx: VariableStmtContext | ConstStmtContext, doc: TextDocument) {
        super(ctx, doc);
        this.symbolKind = SymbolKind.Variable;
        // TODO: No private modifier is, by default, private.
        // MS recommends explicitly using Public or Private rather than Dim at the module level.
        // Similar, Global means Public and common convention is not to use Global.
        this.hasPrivateModifier = !!(ctx.visibility()?.PRIVATE());
        this.resolveDeclarations(ctx, doc);
    }

    hover = (): Hover => this.declaration?.hover() ??
     ({
        contents: this.hoverContent,
        range: this.range
    });

    getHoverText(): string {
        return "Variant";
    }

    setDeclaredType(e: MethodElement) {
        this.declaration = e;
    }

    private resolveDeclarations(ctx: VariableStmtContext | ConstStmtContext, doc: TextDocument) {
        if (ctx instanceof VariableStmtContext) {
            this.resolveVarDeclarations(ctx, doc);
        } else {
            this.resolveConstDeclarations(ctx, doc);
        }
    }

    private resolveVarDeclarations(ctx: VariableStmtContext, doc: TextDocument) {
        const tokenMods = this.getSemanticTokenModifiers(ctx);
        ctx.variableListStmt().variableSubStmt().forEach((x) =>
            this.variableList.push(new VariableDeclarationElement(x, doc, tokenMods, this.hasPrivateModifier)));
    }

    private resolveConstDeclarations(ctx: ConstStmtContext, doc: TextDocument) {
        const tokenMods = this.getSemanticTokenModifiers(ctx);
        ctx.constSubStmt().forEach((x) => this.variableList.push(
            new VariableDeclarationElement(x, doc, tokenMods, this.hasPrivateModifier)));
    }

    private getSemanticTokenModifiers(ctx: VariableStmtContext | ConstStmtContext): SemanticTokenModifiers[] {
        const result: SemanticTokenModifiers[] = [SemanticTokenModifiers.declaration];
        if (ctx instanceof VariableStmtContext && ctx.STATIC())
            result.push(SemanticTokenModifiers.static);
        if (ctx instanceof ConstStmtContext)
            result.push(SemanticTokenModifiers.readonly);
        return result;
    }
}

export class VariableDeclarationElement extends BaseElement {
    readonly name = "VariableDeclarationElement";
    asType: TypeContext | undefined;
    hasPrivateModifier = false;

    constructor(ctx: VariableSubStmtContext | ConstSubStmtContext, doc: TextDocument, tokenModifiers: SemanticTokenModifiers[], hasPrivateModifier: boolean) {
        super(ctx, doc);
        this.hasPrivateModifier = hasPrivateModifier;
        this.asType = TypeContext.create(ctx, doc);
        this.symbolKind = vbaTypeToSymbolConverter(this.asType?.text ?? 'variant');
        this.createSemanticToken(tokenModifiers);
    }

    private createSemanticToken(tokenModifiers: SemanticTokenModifiers[]) {
        const name = this.identifier!;
        this.semanticToken = new SemanticToken(
            name.range.start.line,
            name.range.start.character,
            name.text.length,
            SemanticTokenTypes.variable,
            tokenModifiers
        );
    }
}

export class VariableAssignElement extends BaseElement {
    readonly name = "VariableAssignElement";

    private _leftImplicitCall: ImplicitCallElement | undefined;
    private _rightImplicitCall: ImplicitCallElement | undefined;

    get leftImplicitCall() {
        return this._leftImplicitCall!;
    }
    get rightImplicitCall() {
        return this._rightImplicitCall!;
    }

    constructor(ctx: LetStmtContext | SetStmtContext, doc: TextDocument) {
        super(ctx, doc);
        const callStmtContext = ctx.implicitCallStmt_InStmt();
        const varOrProc = callStmtContext.iCS_S_VariableOrProcedureCall();
        if (varOrProc) {
            this.identifier = new IdentifierElement(varOrProc.ambiguousIdentifier(), doc);
            return;
        }
    }
    symbolInformation = (_: string) => undefined;

    /**
     * Adds an implicit call to the left or right side of the assignment.
     * @param implicitCall the implicit call to add.
     */
    addImplicitCall(implicitCall: ImplicitCallElement) {
        if (this._leftImplicitCall) {
            this._rightImplicitCall = implicitCall;
            this.validateTypes();
        }
        else {
            this._leftImplicitCall = implicitCall;
        }
    }

    private validateTypes() {
        return false;
    }
}

/**
 * Represents a literal, variable, or call that can be assigned to a variable.
 */
export class AssignmentElement extends BaseElement {
    readonly name = "AssignmentElement";
    variableType: Type;

    constructor(ctx: ValueStmtContext | ImplicitCallStmt_InStmtContext, doc: TextDocument) {
        super(ctx, doc);
        this.variableType = this.getType(ctx);
    }

    private getType(ctx: ValueStmtContext | ImplicitCallStmt_InStmtContext): Type {
        if(ctx instanceof VsLiteralContext) {
            const litCtx = ctx.literal();

            if(litCtx.STRINGLITERAL()) {
                return Type.string;
            }

            if(litCtx.INTEGERLITERAL()) {
                return Type.integer;
            }

            if(litCtx.DOUBLELITERAL()) {
                return Type.double;
            }

            if(litCtx.TRUE() || litCtx.FALSE()) {
                return Type.boolean;
            }

            if(litCtx.DATELITERAL()) {
                return Type.date;
            }

            if(litCtx.SHORTLITERAL()) {
                return Type.short;
            }

            if(litCtx.NOTHING() || litCtx.NULL_()) {
                return Type.variant;
            }
            

            if(litCtx.HEXLITERAL()) {
                return Type.hex;
            }

            if(litCtx.OCTLITERAL()) {
                return Type.oct;
            }
            
            throw new Error("Unknown literal type.");
            
        }
        else {

            return Type.variant;
        }
    }

    private getLiteralType(ctx: LiteralContext): Type {

        return Type.variant;
    }


}