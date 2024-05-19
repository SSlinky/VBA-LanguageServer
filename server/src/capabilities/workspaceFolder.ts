import { ClientCapabilities, InitializeResult } from 'vscode-languageserver';
import { LanguageServerConfiguration } from '../server';


export function hasConfigurationCapability(languageServerConfiguration: LanguageServerConfiguration) {
	const capabilities = languageServerConfiguration.params.capabilities;
	return !!(capabilities.workspace && !!capabilities.workspace.configuration);
}

function hasWorkspaceFolderCapability(x: ClientCapabilities) {
	return !!(x.workspace && !!x.workspace.workspaceFolders);
}

export function activateWorkspaceFolderCapability(capabilities: ClientCapabilities, result: InitializeResult) {
	if (hasWorkspaceFolderCapability(capabilities)) {
		result.capabilities.workspace = {
			workspaceFolders: { supported: true }
		};
	}
}
