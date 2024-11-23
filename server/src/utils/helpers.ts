import { ParserRuleContext } from 'antlr4ng';
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export function sleep(ms: number): Promise<unknown> {
	return new Promise(resolve => setTimeout(resolve, ms) );
}

export function contextToRange(doc: TextDocument, ctx?: ParserRuleContext): Range | undefined {
	if (!ctx) {
		return;
	}

	const startIndex = ctx.start?.start ?? 0;
	const stopIndex = ctx.stop?.stop ?? startIndex;
	return Range.create(
		doc.positionAt(startIndex),
		doc.positionAt(stopIndex + 1)
	);
}