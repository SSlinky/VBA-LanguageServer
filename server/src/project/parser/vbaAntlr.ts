// Antlr
import { CharStream, CommonTokenStream, Token, TokenStream } from 'antlr4ng';
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
		return new VbaLexer(CharStream.fromString(doc))
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
		return new VbaPreLexer(CharStream.fromString(doc))
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
		return new VbaFmtLexer(CharStream.fromString(doc))
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
    recover(recognizer: Parser, e: RecognitionException): void {
        // Consume the error token if look-ahead is not EOF.
        const inputStream = recognizer.inputStream;
        if (inputStream.LA(1) === Token.EOF) {
            inputStream.consume();
        }
        this.endErrorCondition(recognizer);
    }
}