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

    // async formatVisit(token: CancellationToken, document: VbaClassDocument | VbaModuleDocument, range?: Range): Promise<VbaFmtListener> {
    //     // // Handle already cancelled.
    //     if (token.isCancellationRequested) {
    //         this.logger.debug(`Format visit cancelled before start.`);
    //         throw new ParseCancellationException(Error('Parse operation cancelled before it started.'));
    //     }

    //     // Listen for cancellation event.
    //     token.onCancellationRequested(() => {
    //         this.logger.debug(`Format visit cancelled during run.`);
    //         throw new ParseCancellationException(new Error('Parse operation cancelled during parse.'));
    //     });


    //     this.logger.debug(`Beginning format visit.`);
    //     const parser = VbaFmtParser.create(document.textDocument.getText(range));
    //     const tree = parser.startRule();

    //     // const visitor = container.resolve(VbaFormatVisitor);
    //     // const visitor = forceAsync(container.resolve(VbaFormatVisitor));
    //     // const visitor = forceAsync(new VbaFormatVisitor(this.logger));
    //     const visitor = new VbaFormatVisitor(this.logger);
    //     visitor.token = token;
    //     await visitor.visit(tree);
    //     this.logger.debug(`Operation ${token.isCancellationRequested ? 'cancelled' : 'completed'}.`)

    //     // Temporary call so I don't have to refactor everything just to call it.
    //     return await VbaFmtListener.createAsync(document);
    // }

    private async parseDocumentAsync(token: CancellationToken, listener: VbaListener | VbaPreListener | VbaFmtListener, parser: VbaParser | VbaPreParser | VbaFmtParser) {
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
