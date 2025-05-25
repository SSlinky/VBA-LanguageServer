// Core
import { SymbolKind } from 'vscode-languageserver';

// Project
import {
    AmbiguousIdentifierContext,
    ArrayClauseContext,
    ArrayDesignatorContext,
    ArrayDimContext,
    AsClauseContext,
    ConstItemContext,
    LowerBoundContext,
    PositionalParamContext,
    TypeExpressionContext,
    TypeSuffixContext,
    UpperBoundContext,
    VariableDclContext,
    WitheventsVariableDclContext
} from '../antlr/out/vbaParser';
import { ParserRuleContext } from 'antlr4ng';

export type ArrayDimension = {
    lowerBound: number;
    upperBound: number;
}

declare module '../antlr/out/vbaParser' {

    interface ConstItemContext {
        /** Shortcut to get the type context */
        typeContext(): ParserRuleContext | undefined;
        /** Extension method to get the symbol kind. */
        toSymbolKind(): SymbolKind;
    }

    interface VariableDclContext {
        /** Shortcut the identifier as we know it will always exist. */
        ambiguousIdentifier(): AmbiguousIdentifierContext;
        /** Shortcut to get the type context */
        typeContext(): ParserRuleContext | undefined;
        /** Extension method to get the symbol kind. */
        toSymbolKind(): SymbolKind;
    }

    interface WitheventsVariableDclContext {
        /** Shortcut the identifier as we know it will always exist. */
        ambiguousIdentifier(): AmbiguousIdentifierContext;
        /** Shortcut to get the type context */
        typeContext(): ParserRuleContext | undefined;
        /** Extension method to get the symbol kind. */
        toSymbolKind(): SymbolKind;
    }

    interface PositionalParamContext {
        /** Shortcut the identifier as we know it will always exist. */
        ambiguousIdentifier(): AmbiguousIdentifierContext;
        /** Shortcut to get the type context */
        typeContext(): ParserRuleContext | undefined;
        /** Extension method to get the symbol kind. */
        toSymbolKind(): SymbolKind;
    }

    interface AsClauseContext {
        isObject: boolean;
        isVariant: boolean;
        isPrimative: boolean;
        classTypeName: string | undefined;
    }

    interface TypeExpressionContext {
        isObject: boolean;
        isVariant: boolean;
        isPrimative: boolean;
        classTypeName: string | undefined;
    }

    interface TypeSuffixContext {
        isObject: boolean;
        isVariant: boolean;
        isPrimative: boolean;
        classTypeName: string | undefined;
    }

    interface ArrayDesignatorContext {
        isResizable: boolean;
        getDimensions(): ArrayDimension[] | undefined;
    }

    interface ArrayDimContext {
        isResizable: boolean;
        getDimensions(): ArrayDimension[] | undefined;
    }
}

ConstItemContext.prototype.typeContext = function (): ParserRuleContext | undefined {
    return this.typeSuffix()
        ?? this.constAsClause()?.builtinType();
};

VariableDclContext.prototype.ambiguousIdentifier = function (): AmbiguousIdentifierContext {
    // A variable will always be typed or untyped.
    return this.typedVariableDcl()?.typedName().ambiguousIdentifier()
        ?? this.untypedVariableDcl()!.ambiguousIdentifier();
};


VariableDclContext.prototype.typeContext = function (): ParserRuleContext | undefined {
    return this.typedVariableDcl()?.typedName().typeSuffix()
        ?? this.untypedVariableDcl()?.asClause()?.asType()?.typeSpec()
        ?? this.untypedVariableDcl()?.asClause()?.asAutoObject()?.classTypeName();
};

PositionalParamContext.prototype.ambiguousIdentifier = function (): AmbiguousIdentifierContext {
    return this.paramDcl().untypedNameParamDcl()?.ambiguousIdentifier()
        ?? this.paramDcl().typedNameParamDcl()!.typedName().ambiguousIdentifier()!;
};

PositionalParamContext.prototype.typeContext = function (): ParserRuleContext | undefined {
    return this.paramDcl().untypedNameParamDcl()?.parameterType()?.typeExpression()
        ?? this.paramDcl().typedNameParamDcl()?.typedName().typeSuffix();
};


// Type Properties

Object.defineProperty(TypeExpressionContext.prototype, "isPrimative", {
    get: function (this: TypeExpressionContext): boolean {
        return !!this.builtinType() && !this.isVariant;
    }
});

Object.defineProperty(TypeExpressionContext.prototype, "isVariant", {
    get: function (this: TypeExpressionContext): boolean {
        return !!this.builtinType()?.reservedTypeIdentifier()?.VARIANT()
            || !!this.builtinType()?.reservedTypeIdentifierB()?.VARIANT_B();
    }
});

Object.defineProperty(TypeExpressionContext.prototype, "isObject", {
    get: function (this: TypeExpressionContext): boolean {
        return !this.isPrimative && !this.isVariant;
    }
});

Object.defineProperty(TypeExpressionContext.prototype, "classTypeName", {
    get: function (this: TypeExpressionContext): string | undefined {
        return this.definedTypeExpression()?.getText();
    }
});

Object.defineProperty(TypeSuffixContext.prototype, "isPrimative", {
    get: function (this: TypeSuffixContext): boolean {
        return true;
    }
});

Object.defineProperty(TypeSuffixContext.prototype, "isVariant", {
    get: function (this: TypeSuffixContext): boolean {
        return false;
    }
});

Object.defineProperty(TypeSuffixContext.prototype, "isObject", {
    get: function (this: TypeSuffixContext): boolean {
        return false;
    }
});

Object.defineProperty(TypeSuffixContext.prototype, "classTypeName", {
    get: function (this: TypeSuffixContext): string | undefined {
        return undefined;
    }
});

Object.defineProperty(AsClauseContext.prototype, "isPrimative", {
    get: function (this: AsClauseContext): boolean {
        const typeSpecContext = this.asType()?.typeSpec();
        return !!(typeSpecContext
            && (typeSpecContext.fixedLengthStringSpec() || typeSpecContext.typeExpression()?.isPrimative)
        );
    }
});

Object.defineProperty(AsClauseContext.prototype, "isVariant", {
    get: function (this: AsClauseContext): boolean {
        return this.asType()?.typeSpec().typeExpression()?.isVariant ?? false;
    }
});

Object.defineProperty(AsClauseContext.prototype, "isObject", {
    get: function (this: AsClauseContext): boolean {
        const isAutoObject = !!this.asAutoObject();
        const isTypeExprObject = !!(this.asType()?.typeSpec().typeExpression() ?? false);
        return isAutoObject || isTypeExprObject;
    }
});

Object.defineProperty(AsClauseContext.prototype, "classTypeName", {
    get: function (this: AsClauseContext): string | undefined {
        return this.isObject
            ? this.asType()?.typeSpec().getText()
            ?? this.asAutoObject()?.classTypeName().getText()
            : undefined;
    }
});

Object.defineProperty(ArrayDesignatorContext.prototype, "isResizable", {
    get: function (this: ArrayDesignatorContext): boolean {
        return false;
    }
});

ArrayDesignatorContext.prototype.getDimensions = function (): ArrayDimension[] | undefined {
    return undefined;
};

Object.defineProperty(ArrayClauseContext.prototype, "isResizable", {
    get: function (this: ArrayClauseContext): boolean {
        return !!this.arrayDim().boundsList();
    }
});

ArrayDimContext.prototype.getDimensions = function (): ArrayDimension[] | undefined {
    const boundsListCtx = this.boundsList();
    const getNum = (boundCtx: LowerBoundContext | UpperBoundContext | null): number => {
        const FIXME_DEFAULT = 0;
        const n = boundCtx?.constantExpression().expression().literalExpression()?.INTEGERLITERAL()?.getText();
        return n === undefined ? FIXME_DEFAULT : Number.parseInt(n);
    };
    return !boundsListCtx ? undefined : boundsListCtx.dimSpec().map(dimensionCtx => {
        return {
            lowerBound: getNum(dimensionCtx.lowerBound()),
            upperBound: getNum(dimensionCtx.upperBound())
        };
    });
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

PositionalParamContext.prototype.toSymbolKind = function (): SymbolKind {
    return toSymbolKind(this.typeContext());
};


function toSymbolKind(context: ParserRuleContext | undefined): SymbolKind {
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
