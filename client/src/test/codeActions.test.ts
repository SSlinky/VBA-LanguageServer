/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, runOnActivate } from './helper';
import { toRange } from './util';

suite('Should get module code actions', () => {
	test('actions.module.missingOptionExplicitCodeAction', async () => {
		const docUri = getDocUri('EmptyModule.bas');
		const edits = new vscode.WorkspaceEdit();
		edits.set(docUri, [
			vscode.TextEdit.insert(new vscode.Position(1, 1), "\nOption Explicit")
		]);
		await testCodeActions(docUri, toRange(2, 1, 2, 1), [
			{
				title: "Insert Option Explicit",
				kind: vscode.CodeActionKind.QuickFix,
				edit: edits
			}
		]);
	});
});

async function testCodeActions(docUri: vscode.Uri, activationRange: vscode.Range, expectedResults: vscode.CodeAction[]) {
	await activate(docUri);

	// Use this method first to ensure the extension is activated.
	const actualResults = await runOnActivate(
		// Action to run.
		() => vscode.commands.executeCommand<vscode.CodeAction[]>(
			'vscode.executeCodeActionProvider',
			docUri,
			activationRange
		),
		// Test that shows it ran.
		(result) => result.length > 0
	);

	assert.equal(actualResults.length, expectedResults.length, `Expected ${expectedResults.length}, got ${actualResults.length}`);

	expectedResults.forEach((expected, i) => {
		const actual = actualResults[i];
		assert.equal(actual.title, expected.title, `Title: expected ${expected.title}, got ${actual.title}`);
		assert.equal(actual.edit.has(docUri), true, "Missing actual edits");
		assert.equal(expected.edit.has(docUri), true, "Missing expected edits");

		const actEdits = actual.edit.get(docUri);
		const expEdits = expected.edit.get(docUri);

		assert.equal(actEdits.length, expEdits.length, `Count edits for ${actual.title}`);
		expEdits.forEach((expEdit, i) => {
			const actEdit = actEdits[i];
			assert.equal(actEdit.newText, expEdit.newText, `Edit text: expected ${expEdit.newText}, got ${actEdit.newText}`);
			assert.deepEqual(actEdit.range, expEdit.range, `Edit range: expected ${JSON.stringify(expEdit.range)}, got ${JSON.stringify(actEdit.range)}`);
		});
	});
}