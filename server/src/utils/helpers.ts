import { Range } from 'vscode-languageserver';
import { SyntaxElement } from './vbaSyntaxElements';

function indexOfNearestUnder(arr: Array<number>, n: number) {
	if (arr.length === 0) { return -1; }
	for (let i = 0; i < arr.length; i++) {
		const result = n - arr[i];
		if (result === 0) { return i; }
		if (result < 0) { return i - 1; }
	}
	return arr.length - 1;
}

function getMatchIndices(re: RegExp, text: string, maxReturned?: number): number[] {
	let m = re.exec("");
	let i = 0;
	const results: number[] = [];
	while ((m = re.exec(text)) && i++ < (maxReturned ?? 2000)) {
		results.push(groupIndex(m, 1));
	}
	return results;
}

function stripQuotes(text: string): string {
	const exp = /^"?(.*?)"?$/;
	return exp.exec(text)![1];
}

function groupIndex(reExec: RegExpExecArray, i: number) {
	return reExec.index + reExec[0].indexOf(reExec[i]);
}

function rangeIsChildOfElement(tr: Range, element: SyntaxElement): boolean {
	const pr = element.range;
	
	const psl = pr.start.line;
	const psc = pr.start.character;
	const tsl = tr.start.line;
	const tsc = tr.start.character;

	const pel = pr.end.line;
	const pec = pr.end.character;
	const tel = tr.end.line;
	const tec = tr.end.character;		

	const prStartEarlier = (psl < tsl) || (psl === tsl && psc <= tsc);
	const prEndsAfter = (pel > tel) || (pel === tel && pec >= tec);

	return prStartEarlier && prEndsAfter;
}

function sleep(ms: number): Promise<unknown> {
	return new Promise(resolve => setTimeout(resolve, ms) );
}

export { stripQuotes, indexOfNearestUnder, getMatchIndices, rangeIsChildOfElement, sleep};