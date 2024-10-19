import { ParseTreeWalker } from 'antlr4ng';

import { VbaClassDocument, VbaModuleDocument } from '../document';
import { VbaListener, VbaPreListener } from './vbaListener';
import { VbaParser, VbaPreParser } from './vbaAntlr';

export class SyntaxParser {
    async parseAsync(document: VbaClassDocument | VbaModuleDocument): Promise<boolean> {
        // Preparse the document if we find a precompiler statement.
        const regexp = new RegExp(/^\s*#If/gmi)
        let docText = document.textDocument.getText();
        if (regexp.test(docText)) {
            const prelistener = await VbaPreListener.createAsync(document);
            const preparser = VbaPreParser.create(docText);
            await this._parseAsync(prelistener, preparser);
            docText = prelistener.text;
        }

        // Perform main document parse without compiler directives.
        const listener = await VbaListener.createAsync(document);
        const parser = VbaParser.create(docText);
        await this._parseAsync(listener, parser);
        return true;
    }

    private async _parseAsync(listener: VbaListener | VbaPreListener, parser: VbaParser | VbaPreParser) {
        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }
}
