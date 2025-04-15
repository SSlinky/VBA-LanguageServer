// Antlr
import { CharStream, CommonTokenStream, InputMismatchException, IntervalSet, Token, TokenStream } from 'antlr4ng';
import { DefaultErrorStrategy, Parser, RecognitionException } from 'antlr4ng';
import { vbaLexer } from '../../antlr/out/vbaLexer';
import { vbaParser } from '../../antlr/out/vbaParser';
import { vbapreLexer } from '../../antlr/out/vbapreLexer';
import { vbapreParser } from '../../antlr/out/vbapreParser';
import { vbafmtLexer } from '../../antlr/out/vbafmtLexer';
import { vbafmtParser } from '../../antlr/out/vbafmtParser';


export class VbaLexer extends vbaLexer {
    constructor(input: CharStream) {
        super(input);
    }

    static create(doc: string): VbaLexer {
        return new VbaLexer(CharStream.fromString(doc));
    }
}


export class VbaParser extends vbaParser {
    constructor(input: TokenStream) {
        super(input);
    }

    static create(document: string): VbaParser {
        const lexer = VbaLexer.create(document);
        const parser = new VbaParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.errorHandler = new VbaErrorHandler();
        return parser;
    }
}


export class VbaPreLexer extends vbapreLexer {
    constructor(input: CharStream) {
        super(input);
    }

    static create(doc: string): VbaPreLexer {
        return new VbaPreLexer(CharStream.fromString(doc));
    }
}


export class VbaPreParser extends vbapreParser {
    constructor(input: TokenStream) {
        super(input);
    }

    static create(document: string): VbaPreParser {
        const lexer = VbaPreLexer.create(document);
        const parser = new VbaPreParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.errorHandler = new VbaErrorHandler();
        return parser;
    }
}


export class VbaFmtLexer extends vbafmtLexer {
    constructor(input: CharStream) {
        super(input);
    }

    static create(doc: string): VbaFmtLexer {
        return new VbaFmtLexer(CharStream.fromString(doc));
    }
}


export class VbaFmtParser extends vbafmtParser {
    constructor(input: TokenStream) {
        super(input);
    }

    static create(document: string): VbaFmtParser {
        const lexer = VbaFmtLexer.create(document);
        const tokens = new CommonTokenStream(lexer);
        const parser = new VbaFmtParser(tokens);
        parser.removeErrorListeners();
        parser.errorHandler = new VbaErrorHandler();
        return parser;
    }
}


export class VbaErrorHandler extends DefaultErrorStrategy {
    override recover(recognizer: Parser, e: RecognitionException): void {
        // Consume the error token if look-ahead is not EOF.
        const inputStream = recognizer.inputStream;
        if (inputStream.LA(1) !== Token.EOF) {
            inputStream.consume();
        }
        this.endErrorCondition(recognizer);
    }

    override recoverInline(recognizer: Parser): Token {
        const stream = recognizer.inputStream;
        const thisToken = recognizer.getCurrentToken();

        // Recover using deletion strategy.
        const nextToken = stream.LT(2);
        const expectedTokens = recognizer.getExpectedTokens();
        if (nextToken && expectedTokens.contains(nextToken.type)) {
            recognizer.consume();
            this.reportMatch(recognizer);
            return thisToken;
        }

        // Failsafe to prevent circular insertions.
        const MAXRECURSION = -20;
        for (let i = -1; i >= MAXRECURSION; i--) {
            if (i <= -20) {
                throw new InputMismatchException(recognizer);
            }
            const wasInsertedToken = this.isTokenPositionMatch(thisToken, recognizer.inputStream.LT(i));
            if (!wasInsertedToken) {
                break;
            }
        }

        // When we don't know what could come next, invalidate the entire line.
        if (expectedTokens.minElement === -1) {
            const invalidTokens: Token[] = [];
            while (![vbaLexer.NEWLINE, vbaLexer.EOF].includes(stream.LA(1))) {
                invalidTokens.push(stream.LT(1)!);
                recognizer.consume();
            }
            if (invalidTokens.length > 0) {
                const missingToken = this.createErrorToken(recognizer, invalidTokens);
                return missingToken;
            }
        }

        // Recover using insertion strategy.
        const missingToken = this.createExpectedToken(recognizer, expectedTokens);
        this.reportMatch(recognizer);
        return missingToken;
    }

    private createExpectedToken(recognizer: Parser, expectedTokens: IntervalSet): Token {
        // Set up the token attributes.
        const type = expectedTokens.length === 0
            ? Token.INVALID_TYPE
            : expectedTokens.minElement;

        const expectedIdentifiers = expectedTokens.toArray().map(
            t => recognizer.vocabulary.getLiteralName(t)
                ?? recognizer.vocabulary.getDisplayName(t)
        );
        const plural = expectedIdentifiers.length > 1 ? 's' : '';
        const expectedText = expectedIdentifiers.join(', ');
        const text = `<missing token${plural} ${expectedText}>`;
        const currentToken = recognizer.getCurrentToken();

        // Create the token.
        return recognizer.getTokenFactory().create(
            [
                recognizer.tokenStream.tokenSource,
                recognizer.tokenStream.tokenSource.inputStream
            ],
            type,
            text,
            Token.DEFAULT_CHANNEL,
            currentToken.start,
            currentToken.stop,
            currentToken.line,
            currentToken.column
        );
    }

    private createErrorToken(recognizer: Parser, consumedTokens: Token[]): Token {
        // Set up the token attributes.
        const type = Token.INVALID_TYPE;
        const text = `Invalid syntax: ${consumedTokens.map(t => t.text ?? '?').join('')}`;

        // We know have at least one token consumed.
        const fromToken = consumedTokens[0];
        const toToken = consumedTokens.at(-1);

        // Create the token.
        return recognizer.getTokenFactory().create(
            [
                recognizer.tokenStream.tokenSource,
                recognizer.tokenStream.tokenSource.inputStream
            ],
            type,
            text,
            Token.DEFAULT_CHANNEL,
            fromToken.start,
            toToken?.stop ?? fromToken.stop,
            fromToken.line,
            fromToken.column
        );
    }

    private isTokenPositionMatch(a: Token | null, b: Token | null): boolean {
        return !!a && !!b
            && a.line === b.line
            && a.column === b.column;
    }
}