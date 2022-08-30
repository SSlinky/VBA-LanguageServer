
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

export { stripQuotes, indexOfNearestUnder, getMatchIndices};