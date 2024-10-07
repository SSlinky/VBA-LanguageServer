/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	ServerCapabilities,
} from 'vscode-languageserver/node';

import { Workspace } from './project/workspace';
import { activateSemanticTokenProvider } from './capabilities/semanticTokens';
import { activateWorkspaceFolderCapability } from './capabilities/workspaceFolder';

class LanguageServer {
	workspace?: Workspace;
	configuration?: LanguageServerConfiguration;
	readonly connection;

	constructor() {
		this.connection = createConnection(ProposedFeatures.all);
		this.connection.onInitialize((params: InitializeParams) => {
			// Set up the workspace.
			this.configuration = new LanguageServerConfiguration(params);
			const workspace = new Workspace({
				connection: this.connection,
				capabilities: this.configuration
			});
			this.workspace = workspace;
			
			// Set up the connection result.
			// Update this to make use of the LSCapabilities data class.
			const result = new ConnectionInitializeResult(this.configuration.capabilities);
			activateWorkspaceFolderCapability(params.capabilities, result);
			activateSemanticTokenProvider(result);
			return result;
		});
		this.connection.onInitialized(() => {
			// Register for client configuration notification changes.
			this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
			
		});

		

		this.connection.listen();
	}
}

export class LanguageServerConfiguration {
	params: InitializeParams;
	capabilities: ServerCapabilities<any> = {
		// Implemented
		documentSymbolProvider: true,
		foldingRangeProvider: true,
		textDocumentSync: TextDocumentSyncKind.Incremental,
		diagnosticProvider: {
			interFileDependencies: false,
			workspaceDiagnostics: false
		},
		
		// Implement soon.
		codeActionProvider: false,
		completionProvider: undefined,
		hoverProvider: false,

		// Not implemented.		
		signatureHelpProvider: undefined,
		declarationProvider: false,
		definitionProvider: false,
		typeDefinitionProvider: false,
		implementationProvider: false,
		referencesProvider: false,
		documentHighlightProvider: false,
		codeLensProvider: undefined,
		documentLinkProvider: undefined,
		colorProvider: false,
		workspaceSymbolProvider: false,
		documentFormattingProvider: false,
		documentRangeFormattingProvider: false,
		documentOnTypeFormattingProvider: undefined,
		renameProvider: false,
		selectionRangeProvider: false,
		executeCommandProvider: undefined,
		callHierarchyProvider: false,
		linkedEditingRangeProvider: false,
		workspace: undefined,
		monikerProvider: false,
		experimental: undefined,
	};

	constructor(params: InitializeParams) {
		this.params = params;
	}
}

class ConnectionInitializeResult implements InitializeResult {
	[custom: string]: any;
	capabilities: ServerCapabilities<any>;
	serverInfo?: { name: string; version?: string; };

	constructor(capabilities: ServerCapabilities) {
		this.capabilities = capabilities;
	}
}


const languageServer = new LanguageServer();
