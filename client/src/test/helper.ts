/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as path from 'path';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;
const TIMEOUTMS = 5000;

/**
 * Activates the vscode.lsp-sample extension
 */
export async function activate(docUri: vscode.Uri) {
	// The extensionId is `publisher.name` from package.json
	const ext = vscode.extensions.getExtension('NotisDataAnalytics.vba-lsp')!;
	await ext.activate();
	try {
		doc = await vscode.workspace.openTextDocument(docUri);
		editor = await vscode.window.showTextDocument(doc);
	} catch (e) {
		console.error(e);
	}
}

export function getTimeout() {
	return Date.now() + TIMEOUTMS;
}

async function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runOnActivate<T>(action: () => T|Thenable<T>, test: (result: T) => boolean): Promise<T> {
	const timeout = getTimeout();
	while (Date.now() < timeout) {
		const result = await action(); 
		if (test(result)) {
			return result;
		}
		await sleep(100);
	}
	throw new Error(`Timed out after ${TIMEOUTMS}`);
}

export const getDocPath = (p: string) => {
	return path.resolve(__dirname, '../../../../test/fixtures', p);
};
export const getDocUri = (p: string) => {
	return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
	const all = new vscode.Range(
		doc.positionAt(0),
		doc.positionAt(doc.getText().length)
	);
	return editor.edit(eb => eb.replace(all, content));
}
