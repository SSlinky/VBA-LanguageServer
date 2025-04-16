/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, runOnActivate } from './helper';
import { toRange } from './util';

suite('Should get diagnostics', () => {
	test('diagnostics.class.missingNameAttributeError', async () => {
		await testDiagnostics(getDocUri('DiagnosticsMissingAttributeClass.cls'), [
			{
				message: 'Module missing attribute VB_NAME.',
				range: toRange(4, 3, 4, 3),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			}
		]);
	});

	test('diagnostics.module.missingNameAttributeError', async () => {
		await testDiagnostics(getDocUri('DiagnosticsMissingAttributeModule.bas'), [
			{
				message: 'Module missing attribute VB_NAME.',
				range: toRange(1, 0, 1, 0),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			}
		]);
	});

	test('diagnostics.class.noOptionExplicitWarning', async () => {
		await testDiagnostics(getDocUri('EmptyClass.cls'), [
			{
				message: 'Option Explicit is missing from module header.',
				range: toRange(11, 1, 11, 1),
				severity: vscode.DiagnosticSeverity.Warning,
				source: 'ex'
			}
		]);
	});

	test('diagnostics.module.noOptionExplicitWarning', async () => {
		await testDiagnostics(getDocUri('EmptyModule.bas'), [
			{
				message: 'Option Explicit is missing from module header.',
				range: toRange(2, 1, 2, 1),
				severity: vscode.DiagnosticSeverity.Warning,
				source: 'ex'
			}
		]);
	});

	test('diagnostics.module.generalDiagnostics', async () => {
		// Don't seem to be able to sort these. Good luck!
		await testDiagnostics(getDocUri('Diagnostics.bas'), [
			{
				message: 'Module duplicate attribute VB_Name.',
				range: toRange(2, 0, 2, 33),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			},
			{
				message: 'Unknown attribute \'VB_Creatable\' will be ignored.',
				range: toRange(3, 0, 3, 30),
				severity: vscode.DiagnosticSeverity.Warning,
				source: 'ex'
			},
			{
				message: 'Unknown attribute \'VB_Foo\' will be ignored.',
				range: toRange(4, 0, 4, 24),
				severity: vscode.DiagnosticSeverity.Warning,
				source: 'ex'
			},
			{
				message: 'The Do...Loop statement provides a more structured and flexible way to perform looping.',
				range: toRange(10, 4, 10, 8),
				severity: vscode.DiagnosticSeverity.Hint,
				source: 'ex'
			},
			{
				message: 'Unexpected duplicate operator.',
				range: toRange(11, 15, 11, 16),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			},
			{
				message: 'Enum declarations cannot appear below a Sub, Function, or Property declaration.',
				range: toRange(28, 7, 32, 8),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			},
			{
				message: 'Invalid syntax: InvalidSubCall(arg)',
				range: toRange(43, 4, 43, 23),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			}
		]);
	});

	test('diagnostics.class.generalDiagnostics', async () => {
		// Don't seem to be able to sort these. Good luck!
		await testDiagnostics(getDocUri('Diagnostics.cls'), [
			{
				message: 'Module duplicate attribute VB_GlobalNameSpace.',
				range: toRange(8, 0, 8, 36),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			},
			{
				message: 'Module duplicate attribute VB_Exxposed.',
				range: toRange(13, 0, 13, 29),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			},
			{
				message: 'Unknown attribute \'VB_Exxposed\' will be ignored.',
				range: toRange(12, 0, 12, 29),
				severity: vscode.DiagnosticSeverity.Warning,
				source: 'ex'
			},
			{
				message: 'Unknown attribute \'VB_Exxposed\' will be ignored.',
				range: toRange(13, 0, 13, 29),
				severity: vscode.DiagnosticSeverity.Warning,
				source: 'ex'
			},
			{
				message: 'The Do...Loop statement provides a more structured and flexible way to perform looping.',
				range: toRange(19, 4, 19, 8),
				severity: vscode.DiagnosticSeverity.Hint,
				source: 'ex'
			},
			{
				message: 'Unexpected duplicate operator.',
				range: toRange(20, 15, 20, 16),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			},
			{
				message: 'Enum declarations cannot appear below a Sub, Function, or Property declaration.',
				range: toRange(37, 7, 41, 8),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			}
		]);
	});
});

async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
	await activate(docUri);

	// Use this method first to ensure the extension is activated.
	const actualDiagnostics = await runOnActivate(
		() => vscode.languages.getDiagnostics(docUri),
		(result) => result.length > 0
	);
	assert.equal(actualDiagnostics.length, expectedDiagnostics.length, "Count");

	expectedDiagnostics.forEach((expectedDiagnostic, i) => {
		const actualDiagnostic = actualDiagnostics[i];
		assert.equal(actualDiagnostic.message, expectedDiagnostic.message, `Message: expected '${expectedDiagnostic.message}' got '${actualDiagnostic.message}'.`);
		assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range, `Range: expected '${JSON.stringify(expectedDiagnostic.range)}' got '${JSON.stringify(actualDiagnostic.range)}'.`);
		assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity, `Severity: expected '${expectedDiagnostic.severity}' got '${actualDiagnostic.severity}'.`);
	});
}