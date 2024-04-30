import { TextDocument } from 'vscode-languageserver-textdocument';
import { SyntaxElement } from '../parser/elements/base';
import { ParserRuleContext } from 'antlr4ts';
import { Range } from 'vscode-languageserver';

export function indexOfNearestUnder(arr: Array<number>, n: number) {
	if (arr.length === 0) { return -1; }
	for (let i = 0; i < arr.length; i++) {
		const result = n - arr[i];
		if (result === 0) { return i; }
		if (result < 0) { return i - 1; }
	}
	return arr.length - 1;
}

export function getMatchIndices(re: RegExp, text: string, maxReturned?: number): number[] {
	let m = re.exec("");
	let i = 0;
	const results: number[] = [];
	while ((m = re.exec(text)) && i++ < (maxReturned ?? 2000)) {
		results.push(groupIndex(m, 1));
	}
	return results;
}

export function stripQuotes(text: string): string {
	const exp = /^"?(.*?)"?$/;
	return exp.exec(text)![1];
}

function groupIndex(reExec: RegExpExecArray, i: number) {
	return reExec.index + reExec[0].indexOf(reExec[i]);
}

export function rangeIsChildOfElement(tr: Range, element: SyntaxElement): boolean {
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

export function sleep(ms: number): Promise<unknown> {
	return new Promise(resolve => setTimeout(resolve, ms) );
}

/**
 * Gets the document Range address of the context element.
 * @param ctx the context element
 * @param doc the underlying document
 * @returns A Range representing an address of the context in the document.
 */
export function getCtxRange(ctx: ParserRuleContext, doc: TextDocument): Range {
	const start = ctx.start.startIndex;
	const stop = ctx.stop?.stopIndex ?? start;
	return Range.create(
		doc.positionAt(start),
		doc.positionAt(stop + 1));
}

/**
 * Represents the range as a line:char address string.
 * @param r a range object.
 * @returns The line/char address of the range.
 */
export function rangeAddress(r: Range): string {
	const sl = r.start.line;
	const el = r.end.line;
	const sc = r.start.character;
	const ec = r.end.character;

	if(sl==el && sc==ec) {
		return `${sl}:${sc}`;
	}
	if(sl==el) {
		return `${sl}:${sc}-${ec}`;
	}
	return `${sl}:${sc}-${el}:${ec}`;
}
