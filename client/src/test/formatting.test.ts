import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, runOnActivate } from './helper';
import { toRange } from './util';

suite('Should get class text edits', () => {
	test('formatting.class.template', async () => {
		await testTextEdits(getDocUri('FormatTemplateClass.cls'), [
			{range: toRange(3, 0, 3, 0), newText: '  '},
			{range: toRange(6, 0, 6, 2), newText: ''},
			{range: toRange(7, 0, 7, 4), newText: ''},
			{range: toRange(8, 0, 8, 8), newText: ''}
		]);
	});
});

suite('Should get module text edits', () => {
	test('formatting.module.directives', async () => {
		await testTextEdits(getDocUri('FormatPrecompilerDirectives.bas'), [
			// Staggered (half) indentation.
			{range: toRange(27, 0, 27, 0), newText: '  '},
			{range: toRange(28, 0, 28, 0), newText: '    '},
			{range: toRange(29, 0, 29, 0), newText: '  '},
			{range: toRange(31, 0, 31, 0), newText: '  '},
			{range: toRange(32, 0, 32, 0), newText: '    '},
			{range: toRange(33, 0, 33, 0), newText: '  '},
			{range: toRange(34, 0, 34, 0), newText: '  '},

			// Different method signatures.
			{range: toRange(38, 0, 38, 0), newText: '  '},
			{range: toRange(40, 0, 40, 0), newText: '  '},
			{range: toRange(42, 0, 42, 0), newText: '    '},

			// Nested pre blocks.
			{range: toRange(46, 0, 46, 0), newText: '  '},
			{range: toRange(47, 0, 47, 0), newText: '    '},
			{range: toRange(48, 0, 48, 0), newText: '  '},
			{range: toRange(49, 0, 49, 0), newText: '    '},
			{range: toRange(50, 0, 50, 0), newText: '  '},
			{range: toRange(52, 0, 52, 0), newText: '  '}
		]);
	});
});

async function testTextEdits(docUri: vscode.Uri, expectedTextEdits: vscode.TextEdit[]) {
	await activate(docUri);
	await vscode.window.showTextDocument(docUri);
	const action = () => vscode.commands.executeCommand<vscode.TextEdit[]>(
		'vscode.executeFormatDocumentProvider',
		docUri,
		{ tabSize: 4, insertSpaces: true }
	);

	// Use this method first to ensure the extension is activated.
	const actualEdits = await runOnActivate(
		action,
		(result) => Array.isArray(result) && result.length > 0
	);

	assert.equal(actualEdits.length ?? 0, expectedTextEdits.length, "Count");

	expectedTextEdits.forEach((expectedEdit, i) => {
		const actualEdit = actualEdits[i];
		assert.deepEqual(actualEdit.range, expectedEdit.range, `Edit ${i} range`);
		assert.equal(actualEdit.newText, expectedEdit.newText, `Edit ${i} text`);
	});
}