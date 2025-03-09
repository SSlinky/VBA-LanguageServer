// Core
import { Range, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { VbaFmtListener } from './parser/vbaListener';


export function getFormattingEdits(document: TextDocument, listener: VbaFmtListener, range?: Range): TextEdit[] {
	// Return nothing if we have nothing.
	if (document.getText() == '')
		return [];

	const result: TextEdit[] = [];

	const startLine = range?.start.line ?? 0;
	const endLine = (range?.end.line ?? document.lineCount) + 1;

	let trackedIndentLevel = 0;
	const baseIndentLevel = getIndentLevel(document.getText(range));

	for (let i = startLine; i < endLine; i++) {
		const text = getLine(document, i);

		// Ignore comment lines.
		if (/^\s*'/.test(text)) continue;

		// Actual indent level
		const currentIndentLevel = getIndentLevel(text);
		const newIndentLevel = listener.getIndent(i);
		if (currentIndentLevel != newIndentLevel) {
			result.push({
				range: getIndentRange(text, i)!,
				newText: ' '.repeat(newIndentLevel * 2)
			});
		}
	}

	return result;
}

function getExpectedIndent(listener: VbaFmtListener, range: Range, n: number) {
	// The listener will be offset by the range, e.g., if the range.start.line
	// is 5 then getting line 2 from the listener will be document line 7.
	return listener.getIndent(n - range.start.line + 1)
}

function getIndentRange(text: string, n: number): Range | undefined {
	const match = /^(?!\s*')(\s*)/m.exec(text);
	if (match) {
		return {
			start: { line: n, character: 0 },
			end: { line: n, character: match[0].length }
		}
	}
}

function getIndentLevel(text: string): number {
	// Get spaces at start of non-comment lines (tab is four spaces)
	const normalised = text.replace(/\t/g, '    ')
	const match = /^(?!\s*')(\s*)/m.exec(normalised);
	
	// Default is no indent.
	if (!match) {
		return 0;
	}

	// Four spaces per indent.
	return (match[0].length / 4) | 0;
}

function getLine(d: TextDocument, n: number): string {
	return d.getText({
		start: { line: n, character: 0 },
		end: { line: n + 1, character: 0
		}
	})
}