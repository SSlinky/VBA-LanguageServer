// Core
import { ClientCapabilities, InitializeResult } from 'vscode-languageserver';

// Project
import { ILanguageServer } from '../injection/interface';


function hasWorkspaceFolderCapability(x: ClientCapabilities) {
	return !!(x.workspace && !!x.workspace.workspaceFolders);
}

export function hasWorkspaceConfigurationCapability(server: ILanguageServer) {
	const capabilities = server.configuration?.params.capabilities;
	return !!(capabilities?.workspace && !!capabilities.workspace.configuration);
}

export function activateWorkspaceFolderCapability(capabilities: ClientCapabilities, result: InitializeResult) {
	if (hasWorkspaceFolderCapability(capabilities)) {
		result.capabilities.workspace = {
			workspaceFolders: { supported: true }
		};
	}
}
