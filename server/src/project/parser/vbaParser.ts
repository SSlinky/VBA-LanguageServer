// Antlr
import { ParseCancellationException, ParseTreeWalker } from 'antlr4ng';
import { VbaFmtParser, VbaParser, VbaPreParser } from './vbaAntlr';
import { VbaFmtListener, VbaListener, VbaPreListener } from './vbaListener';

// Project
import { VbaClassDocument, VbaModuleDocument } from '../document';
import { CancellationToken, Range } from 'vscode-languageserver';
import { Logger } from '../../injection/interface';


export class SyntaxParser {
    constructor(private logger: Logger) { }

    async parse(token: CancellationToken, document: VbaClassDocument | VbaModuleDocument): Promise<void> {
        // Preparse the document if we find a precompiler statement.
        const regexp = new RegExp(/^\s*#If/gmi);
        let docText = document.textDocument.getText();
        if (regexp.test(docText)) {
            this.logger.debug(`Beginning pre-parse.`);
            const prelistener = await VbaPreListener.create(document);
            const preparser = VbaPreParser.create(docText);
            await this.parseDocument(token, prelistener, preparser);
            docText = prelistener.text;
            this.logger.debug(`Completed pre-parse.`);
        }

        // Perform main document parse without compiler directives.
        this.logger.debug(`Beginning main parse.`);
        const listener = await VbaListener.create(document);
        const parser = VbaParser.create(docText);
        await this.parseDocument(token, listener, parser);
        this.logger.debug(`Completed main parse.`);
    }

    async formatParse(token: CancellationToken, document: VbaClassDocument | VbaModuleDocument, range?: Range): Promise<VbaFmtListener> {
        // Special parser focused on document format.
        this.logger.debug(`Beginning format parse.`);
        const listener = await VbaFmtListener.create(document);
        const parser = VbaFmtParser.create(document.textDocument.getText(range));
        await this.parseDocument(token, listener, parser);
        this.logger.debug(`Completed format parse.`);

        return listener;
    }

    private async parseDocument(token: CancellationToken, listener: VbaListener | VbaPreListener | VbaFmtListener, parser: VbaParser | VbaPreParser | VbaFmtParser) {
        // Handle already cancelled.
        if (token.isCancellationRequested) {
            throw new ParseCancellationException(Error('Parse operation cancelled before it started.'));
        }

        // Listen for cancellation event.
        token.onCancellationRequested(() => {
            throw new ParseCancellationException(new Error('Parse operation cancelled during parse.'));
        });

        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }
}
