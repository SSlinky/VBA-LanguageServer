import { TextDocument } from 'vscode-languageserver-textdocument';
import { FoldingRange } from 'vscode-languageserver';
import { getMatchIndices, indexOfNearestUnder } from '../utils/helpers';

export function getFoldingRanges(doc: TextDocument, maxRanges?: number): FoldingRange[] {
	const results: FoldingRange[] = [];

	const reOpenPattern = /^(?:\s*)(?:(?:Public|Private|Friend)\s+)?(?:(?:Static)\s+)?(Function|Sub|Property|Enum|If.*Then\s*(?![^'\n])|Select Case|With|Do|While)(?:[\s\n])/gmi;
	const reClosePattern = /(?:\n\s*)(End|Wend|Loop)\b/g;
	const text = doc.getText();

	const starts = getMatchIndices(reOpenPattern, text, maxRanges);
	const ends = getMatchIndices(reClosePattern, text, maxRanges);
	ends.reverse();

	while (starts.length > 0 && ends.length > 0) {
		const pairedEnd = ends.pop()!;
		const startIdx = indexOfNearestUnder(starts, pairedEnd);
		if (startIdx === -1) { return results; }
		const pairedStart = starts[startIdx];
		starts.splice(startIdx, 1);
		if (pairedEnd === pairedStart) { continue; }

		results.push(
			FoldingRange.create(
				doc.positionAt(pairedStart).line,
				doc.positionAt(pairedEnd).line));
	}

	return results;
}
