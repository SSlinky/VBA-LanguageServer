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

		await testFoldingRanges(getDocUri('FormatTemplateClass.cls'), [
			subFoo,
			subBar,
			whileWend
		]);
	});
});

async function testFoldingRanges(docUri: vscode.Uri, expectedFoldingRanges: vscode.FoldingRange[]) {
	await activate(docUri);
	const actualFoldingRanges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
		'vscode.executeFormatDocumentProvider',
		docUri,
		{ tabSize: 4, insertSpaces: true }
	)

	assert.equal(actualFoldingRanges.length ?? 0, expectedFoldingRanges.length, "Count");

	expectedFoldingRanges.forEach((expectedFoldingRange, i) => {
		const actualFoldingRange = actualFoldingRanges[i];
		assert.deepEqual(actualFoldingRange, expectedFoldingRange, `FoldingRange ${i}`);
	});
}