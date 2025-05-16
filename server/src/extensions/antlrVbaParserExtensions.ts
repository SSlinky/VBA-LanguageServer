// Core
import { SymbolKind } from 'vscode-languageserver';

// Project
import {
    AmbiguousIdentifierContext,
    BuiltinTypeContext,
    ClassTypeNameContext,
    ConstItemContext,
    LExpressionContext,
    TypeSpecContext,
    TypeSuffixContext,
    VariableDclContext,
    WitheventsVariableDclContext
} from '../antlr/out/vbaParser';


declare module '../antlr/out/vbaParser' {

    interface ConstItemContext {
        /** Shortcut the identifier as we know it will always exist. */
        ambiguousIdentifier(): AmbiguousIdentifierContext;
        /** Shortcut to get the type context */
        typeContext(): BuiltinTypeContext | TypeSuffixContext | undefined;
        /** Extension method to get the symbol kind. */
        toSymbolKind(): SymbolKind;
    }

    interface VariableDclContext {
        /** Shortcut the identifier as we know it will always exist. */
        ambiguousIdentifier(): AmbiguousIdentifierContext;
        /** Shortcut to get the type context */
        typeContext(): TypeSpecContext | TypeSuffixContext | ClassTypeNameContext | undefined;
        /** Extension method to get the symbol kind. */
        toSymbolKind(): SymbolKind;
    }

    interface WitheventsVariableDclContext {
        /** Shortcut the identifier as we know it will always exist. */
        ambiguousIdentifier(): AmbiguousIdentifierContext;
        /** Shortcut to get the type context */
        typeContext(): TypeSpecContext | TypeSuffixContext | ClassTypeNameContext | undefined;
        /** Extension method to get the symbol kind. */
        toSymbolKind(): SymbolKind;
    }

    interface LExpressionContext {
        /** Recursive search for LPAREN terminal node. */
        hasParenthesis(): boolean;
    }
}

LExpressionContext.prototype.hasParenthesis = function (): boolean {
    return !!this.LPAREN() || (this.lExpression()?.hasParenthesis() ?? false);
};

VariableDclContext.prototype.ambiguousIdentifier = function (): AmbiguousIdentifierContext {
    // A variable will always be typed or untyped.
    return this.typedVariableDcl()?.typedName().ambiguousIdentifier()
        ?? this.untypedVariableDcl()!.ambiguousIdentifier();
};


VariableDclContext.prototype.typeContext = function (): TypeSpecContext | TypeSuffixContext | ClassTypeNameContext | undefined {
    return this.typedVariableDcl()?.typedName().typeSuffix()
        ?? this.untypedVariableDcl()?.asClause()?.asType()?.typeSpec()
        ?? this.untypedVariableDcl()?.asClause()?.asAutoObject()?.classTypeName();
};


// SymbolKind

ConstItemContext.prototype.toSymbolKind = function (): SymbolKind {
    return toSymbolKind(this.typeContext());
};


WitheventsVariableDclContext.prototype.toSymbolKind = function (): SymbolKind {
    return toSymbolKind(this.typeContext());
};


VariableDclContext.prototype.toSymbolKind = function (): SymbolKind {
    return toSymbolKind(this.typeContext());
};


function toSymbolKind(context: BuiltinTypeContext | TypeSuffixContext | TypeSpecContext | ClassTypeNameContext | undefined): SymbolKind {
    switch (context?.getText().toLocaleLowerCase()) {
        case undefined:
            return SymbolKind.Class;
        case 'boolean':
            return SymbolKind.Boolean;
        case '$': // string
        case 'byte':
        case 'string':
            return SymbolKind.String;
        case '%': // integer
        case '&': // long
        case '^': // longlong
        case '@': // decimal
        case '!': // single
        case '#': // double
        case 'double':
        case 'currency':
        case 'integer':
        case 'long':
        case 'longPtr':
        case 'longLong':
            return SymbolKind.Number;
        case 'object':
            return SymbolKind.Object;
        default:
            return SymbolKind.Class;
    }
}
