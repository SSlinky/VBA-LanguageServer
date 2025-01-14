// Antlr
import { ParseTreeWalker } from 'antlr4ng';
import { VbaParser, VbaPreParser } from './vbaAntlr';
import { VbaListener, VbaPreListener } from './vbaListener';

// Project
import { VbaClassDocument, VbaModuleDocument } from '../document';


export class SyntaxParser {
    async parseAsync(document: VbaClassDocument | VbaModuleDocument): Promise<boolean> {
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
        return true;
    }

    private async parseDocumentAsync(listener: VbaListener | VbaPreListener, parser: VbaParser | VbaPreParser) {
        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }
}
