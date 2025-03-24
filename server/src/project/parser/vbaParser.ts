// Antlr
import { ParseCancellationException, ParseTreeWalker } from 'antlr4ng';
import { VbaFmtParser, VbaParser, VbaPreParser } from './vbaAntlr';
import { VbaFmtListener, VbaListener, VbaPreListener } from './vbaListener';

// Project
import { VbaClassDocument, VbaModuleDocument } from '../document';
import { CancellationToken, Range } from 'vscode-languageserver';
import { LspLogger } from '../../utils/logger';


export class SyntaxParser {
    logger: LspLogger
    constructor(logger: LspLogger) {
        this.logger = logger;
    }

    async parseAsync(token: CancellationToken, document: VbaClassDocument | VbaModuleDocument): Promise<void> {
        // Preparse the document if we find a precompiler statement.
        const regexp = new RegExp(/^\s*#If/gmi)
        let docText = document.textDocument.getText();
        if (regexp.test(docText)) {
            this.logger.debug(`Beginning pre-parse.`);
            const prelistener = await VbaPreListener.createAsync(document);
            const preparser = VbaPreParser.create(docText);
            await this.parseDocumentAsync(token, prelistener, preparser);
            docText = prelistener.text;
            this.logger.debug(`Completed pre-parse.`);
        }

        // Perform main document parse without compiler directives.
        this.logger.debug(`Beginning main parse.`);
        const listener = await VbaListener.createAsync(document);
        const parser = VbaParser.create(docText);
        await this.parseDocumentAsync(token, listener, parser);
        this.logger.debug(`Completed main parse.`);
    }

    async formatParseAsync(token: CancellationToken, document: VbaClassDocument | VbaModuleDocument, range?: Range): Promise<VbaFmtListener> {
        // Special parser focused on document format.
        this.logger.debug(`Beginning format parse.`);
        const listener = await VbaFmtListener.createAsync(document);
        const parser = VbaFmtParser.create(document.textDocument.getText(range));
        await this.parseDocumentAsync(token, listener, parser);
        this.logger.debug(`Completed format parse.`);
        return listener;
    }

    private async parseDocumentAsync(token: CancellationToken, listener: VbaListener | VbaPreListener | VbaFmtListener, parser: VbaParser | VbaPreParser | VbaFmtParser) {
        // Handle already cancelled.
        if (token.isCancellationRequested) {
            this.logger.debug(`Cancellation requested before parsing.`);
            throw new ParseCancellationException(Error('Parse operation cancelled before it started.'));
        }

        // Listen for cancellation event.
        token.onCancellationRequested(() => {
            this.logger.debug(`Cancellation requested during parsing.`);
            throw new ParseCancellationException(new Error('Parse operation cancelled during parse.'));
        })

        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }
}
