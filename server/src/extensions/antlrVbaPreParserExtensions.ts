// Project
import { CompilerConditionalStatementContext, DirectiveExpressionContext } from '../antlr/out/vbapreParser';


declare module '../antlr/out/vbapreParser' {
    interface CompilerConditionalStatementContext {
        vbaExpression(): string;
    }

    interface DirectiveExpressionContext {
        vbaExpression(): string;
    }
}


CompilerConditionalStatementContext.prototype.vbaExpression = function (): string {
    return (this.compilerIfStatement() ?? this.compilerElseIfStatement())!
        .booleanExpression()
        .getText()
        .toUpperCase();
};

DirectiveExpressionContext.prototype.vbaExpression = function (): string {
    return this.getText().toUpperCase();
};