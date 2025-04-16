import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, runOnActivate } from './helper';

suite('Should get folding ranges', () => {
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
	const action = () => vscode.commands.executeCommand<vscode.FoldingRange[]>(
		'vscode.executeFoldingRangeProvider',
		docUri
	);
	
	// Use this method first to ensure the extension is activated.
	const actualFoldingRanges = await runOnActivate(
		action,
		// Test returns 7 folding ranges when run in normal mode
		// but six in debug. Appears to be an issue with timing,
		// probably due to the editor guessing before LSP kicks in.
		(result) => Array.isArray(result) && result.length === expectedFoldingRanges.length
	);

	// No need to assert length as this test will throw if it's not the same.
	expectedFoldingRanges.forEach((expectedFoldingRange, i) => {
		const actualFoldingRange = actualFoldingRanges[i];
		assert.deepEqual(actualFoldingRange, expectedFoldingRange, `FoldingRange ${i}`);
	});
}