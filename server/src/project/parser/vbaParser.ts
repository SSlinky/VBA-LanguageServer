// Antlr
import { ParseTreeWalker } from 'antlr4ng';
import { VbaFmtParser, VbaParser, VbaPreParser } from './vbaAntlr';
import { VbaFmtListener, VbaListener, VbaPreListener } from './vbaListener';

// Project
import { VbaClassDocument, VbaModuleDocument } from '../document';
import { Range } from 'vscode-languageserver';


export class SyntaxParser {
    async parseAsync(document: VbaClassDocument | VbaModuleDocument): Promise<void> {
        // Preparse the document if we find a precompiler statement.
        const regexp = new RegExp(/^\s*#If/gmi)
        let docText = document.textDocument.getText();
        if (regexp.test(docText)) {
            const prelistener = await VbaPreListener.createAsync(document);
            const preparser = VbaPreParser.create(docText);
            await this.parseDocumentAsync(prelistener, preparser);
            docText = prelistener.text;
        }

        // Perform main document parse without compiler directives.
        const listener = await VbaListener.createAsync(document);
        const parser = VbaParser.create(docText);
        await this.parseDocumentAsync(listener, parser);
    }

    async formatParseAsync(document: VbaClassDocument | VbaModuleDocument, range?: Range): Promise<VbaFmtListener> {
        // Special parser focused on document format.
        const listener = await VbaFmtListener.createAsync(document);
        const parser = VbaFmtParser.create(document.textDocument.getText(range));
        await this.parseDocumentAsync(listener, parser);
        return listener;
    }

    private async parseDocumentAsync(listener: VbaListener | VbaPreListener | VbaFmtListener, parser: VbaParser | VbaPreParser | VbaFmtParser) {
        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }
}
