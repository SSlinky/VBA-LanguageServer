// Core
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ParserRuleContext, TerminalNode } from 'antlr4ng';

// Project
import {
    EndOfStatementContext,
    EndOfStatementNoWsContext,
    ProcedureTailContext
} from '../antlr/out/vbaParser';
import { LineEndingContext } from '../antlr/out/vbafmtParser';


declare module 'antlr4ng' {
    interface ParserRuleContext {
        /** Convert the node to a range. */
        toRange(doc: TextDocument): Range;
        startIndex(): number;
        stopIndex(): number;
        hasPositionOf(ctx: ParserRuleContext): boolean;
        endsWithLineEnding: boolean;
        countTrailingLineEndings(): number;
    }

    interface TerminalNode {
        /** Convert the node to a range. */
        toRange(doc: TextDocument): Range;
        startIndex(): number;
        stopIndex(): number;
    }
}

ParserRuleContext.prototype.toRange = function (doc: TextDocument): Range {
    const startIndex = this.start?.start ?? 0;
    const stopIndex = this.stop?.stop ?? startIndex;
    return Range.create(
        doc.positionAt(startIndex),
        doc.positionAt(stopIndex + 1)
    );
};

ParserRuleContext.prototype.startIndex = function (): number {
    return this.start?.start ?? 0;
};

ParserRuleContext.prototype.stopIndex = function (): number {
    return this.stop?.stop ?? this.startIndex();
};

ParserRuleContext.prototype.hasPositionOf = function (ctx: ParserRuleContext): boolean {
    return this.startIndex() === ctx.startIndex() && this.stopIndex() === ctx.stopIndex();
};

Object.defineProperty(ParserRuleContext.prototype, 'endsWithLineEnding', {
    get: function endsWithLineEnding() {
        // Ensure we have a context.
        if (!(this instanceof ParserRuleContext))
            return false;

        // Check last child is a line ending.
        const child = this.children.at(-1);
        if (!child)
            return false;

        // Check the various line ending contexts.
        if (child instanceof LineEndingContext)
            return true;
        if (child instanceof EndOfStatementContext)
            return true;
        if (child instanceof EndOfStatementNoWsContext)
            return true;
        if (child instanceof ProcedureTailContext)
            return true;

        // Run it again!
        if (child.getChildCount() > 0)
            return (child as ParserRuleContext).endsWithLineEnding;

        // Not a line ending and no more children.
        return false;
    }
});

interface LineEndingParserRuleContext {
    NEWLINE(): TerminalNode | null;
}

function isLineEndingParserRuleContext(ctx: unknown): ctx is LineEndingParserRuleContext {
    return typeof ctx === 'object'
        && ctx !== null
        && typeof (ctx as any).NEWLINE === 'function';
}

function countTrailingLineEndings(ctx: ParserRuleContext): number {
    // This function recursively loops through last child of
    // the context to find one that has a NEWLINE terminal node.

    // Check if we have a NEWLINE node.
    if (isLineEndingParserRuleContext(ctx)) {
        const lines = ctx.NEWLINE()?.getText();
        if (!lines) {
            return 0;
        }

        let i = 0;
        let result = 0;
        while (i < lines.length) {
            const char = lines[i];

            if (char === '\r') {
                result++;
                i += lines[i + 1] === '\n' ? 2 : 1;
            } else if (char === '\n') {
                result++;
                i++;
            }
        }

        return result;
    }

    // Recursive call on last child.
    const lastChild = ctx.children.at(-1);
    if (lastChild instanceof ParserRuleContext) {
        return countTrailingLineEndings(lastChild);
    }

    // If we get here, we have no trailing lines.
    return 0;
}

ParserRuleContext.prototype.countTrailingLineEndings = function (): number {
    return countTrailingLineEndings(this);
};


TerminalNode.prototype.toRange = function (doc: TextDocument): Range {
    return Range.create(
        doc.positionAt(this.startIndex()),
        doc.positionAt(this.stopIndex() + 1)
    );
};

TerminalNode.prototype.startIndex = function (): number {
    return this.getPayload()?.start ?? 0;
};

TerminalNode.prototype.stopIndex = function (): number {
    return this.getPayload()?.stop ?? this.startIndex();
};