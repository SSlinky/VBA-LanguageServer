import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

suite('Should get text edits', () => {
	test('formatting.class.template', async () => {
		const subFoo = {start: 23, end: 42};
		const subBar = {start: 44, end: 58};
		const ifBlockOuter = {start: 33, end: 41};
		const ifBlockInner = {start: 34, end: 36};
		const whileWend = {start: 54, end: 57};
		const propFoobar = {start: 61, end: 63};

		await testFoldingRanges(getDocUri('FoldingRanges.bas'), [
			subFoo,
			ifBlockOuter,
			ifBlockInner,
			subBar,
			whileWend,
			propFoobar
		]);
	});
});

async function testFoldingRanges(docUri: vscode.Uri, expectedFoldingRanges: vscode.FoldingRange[]) {
	await activate(docUri);
	const actualFoldingRanges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
		'vscode.executeFoldingRangeProvider',
		docUri
	)

	assert.equal(actualFoldingRanges.length ?? 0, expectedFoldingRanges.length, "Count");

	expectedFoldingRanges.forEach((expectedFoldingRange, i) => {
		const actualFoldingRange = actualFoldingRanges[i];
		assert.deepEqual(actualFoldingRange, expectedFoldingRange, `FoldingRange ${i}`);
	});
}