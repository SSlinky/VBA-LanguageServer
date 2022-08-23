import { TextDocument } from 'vscode-languageserver-textdocument';
import { FoldingRange, integer } from 'vscode-languageserver';

export function getFoldingRanges(doc: TextDocument, maxRanges: number): FoldingRange[] {
	// const range = Range.create(Position.create(0, 0), Position.create(doc.lineCount, 0));
	const results: FoldingRange[] = [];

	const reOpenPattern = /^(?:\s*)(?:(?:Public|Private|Friend)\s+)?(?:(?:Static)\s+)?(Function|Sub|Property|Enum|If.*Then\s*(?![^'\n])|Select Case|With|Do|While)(?:[\s\n])/gmi;
	const reClosePattern = /(?:\n\s*)(End|Wend|Loop)\b/g;
	const text = doc.getText();

	const starts = getMatchIndices(reOpenPattern, text);
	const ends = getMatchIndices(reClosePattern, text);
	ends.reverse();

	while (starts.length > 0 && ends.length > 0) {
		const pairedEnd = ends.pop()!;
		const startIdx = priceIsRight(starts, pairedEnd);
		if (startIdx === -1) { return results; }
		const pairedStart = starts[startIdx];
		starts.splice(startIdx, 1);

		results.push(
			FoldingRange.create(
				doc.positionAt(pairedStart).line,
				doc.positionAt(pairedEnd).line));
	}

	return results;
}

function getMatchIndices(re: RegExp, text: string): integer[] {
	let m = re.exec("");
	const results: integer[] = [];
	while ((m = re.exec(text))) { results.push(groupIndex(m, 1)); }
	return results;
}

// Returns the index of the nearest-but-not-under price number in sortedNums.
function priceIsRight(sortedNums: integer[], price: integer): integer {
	if (sortedNums.length === 0) { return -1; }
	for (let i = 0; i < sortedNums.length; i++) {
		const result = price - sortedNums[i];
		if (result === 0) { return i; }
		if (result < 0) { return i -1; }
	}
	return sortedNums.length;
}

// Returns the index of a group rather than the whole match.
function groupIndex(reExec: RegExpExecArray, i: integer) {
	return reExec.index + reExec[0].indexOf(reExec[i]);
}
