/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

suite('Should get diagnostics', () => {
	test('diagnostics.class.missingNameAttributeError', async () => {
		await testDiagnostics(getDocUri('MissingAttributeClass.cls'), [
			{
				message: 'Module missing attribute VB_NAME.',
				range: toRange(1, 0, 1, 0),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			}
		]);
	});

	test('diagnostics.module.missingNameAttributeError', async () => {
		await testDiagnostics(getDocUri('MissingAttributeModule.bas'), [
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
		// Diagnostics are sorted by severity!
		await testDiagnostics(getDocUri('Diagnostics.bas'), [
			{
				message: 'The Do...Loop statement provides a more structured and flexible way to perform looping.',
				range: toRange(7, 4, 7, 8),
				severity: vscode.DiagnosticSeverity.Information,
				source: 'ex'
			},
			{
				message: 'Unexpected duplicate operator.',
				range: toRange(8, 15, 8, 16),
				severity: vscode.DiagnosticSeverity.Error,
				source: 'ex'
			}
		]);
	});
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
	const start = new vscode.Position(sLine - 1, sChar);
	const end = new vscode.Position(eLine - 1, eChar);
	return new vscode.Range(start, end);
}

async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
	await activate(docUri);

	const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

	assert.equal(actualDiagnostics.length, expectedDiagnostics.length, "Count");

	expectedDiagnostics.forEach((expectedDiagnostic, i) => {
		const actualDiagnostic = actualDiagnostics[i];
		assert.equal(actualDiagnostic.message, expectedDiagnostic.message, "Message");
		assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range, "Range");
		assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity, "Severity");
	});
}