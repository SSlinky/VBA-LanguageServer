// Project
import { CompilerConditionalStatementContext } from '../antlr/out/vbapreParser';


declare module '../antlr/out/vbapreParser' {
    interface CompilerConditionalStatementContext {
        vbaExpression(): string;
    }
}


CompilerConditionalStatementContext.prototype.vbaExpression = function (): string {
    return (this.compilerIfStatement() ?? this.compilerElseIfStatement())!
        .booleanExpression()
        .getText()
        .toLowerCase();
};
