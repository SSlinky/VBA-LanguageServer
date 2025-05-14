/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	ServerCapabilities,
} from 'vscode-languageserver/node';

// Dependency Injection
import 'reflect-metadata';
import { Services } from './injection/services';

// Ensures globally available type extensions.
import './extensions/stringExtensions';
import './extensions/parserExtensions';
import './extensions/numberExtensions';
import { Workspace } from './project/workspace';
import { activateSemanticTokenProvider } from './capabilities/semanticTokens';
import { activateWorkspaceFolderCapability } from './capabilities/workspaceFolder';
import { ClientConfiguration, ILanguageServer, IWorkspace } from './injection/interface';


export class LanguageServer implements ILanguageServer {
	configuration?: LanguageServerConfiguration;
	private _clientConfiguration?: ClientConfiguration;
	readonly connection;
	private workspace?: IWorkspace;

	constructor() {
		this.connection = Services.connection;
		this.connection.onInitialize((params: InitializeParams) => {
			// Set up the workspace.
			this.configuration = new LanguageServerConfiguration(params);
			Services.registerWorkspace(Workspace);
			this.workspace = Services.workspace;

			// Set up the connection result.
			// Update this to make use of the LSCapabilities data class.
			const result = new ConnectionInitializeResult(this.configuration.capabilities);
			activateWorkspaceFolderCapability(params.capabilities, result);
			activateSemanticTokenProvider(result);
			return result;
		});
		// Register shutdown actions
		this.connection.onShutdown(() => { });
		this.connection.onExit(() => process.exit(0));

		// Register for client configuration notification changes.
		this.connection.onInitialized(() => { this.connection.client.register(DidChangeConfigurationNotification.type, undefined); });
		this.connection.onDidChangeConfiguration(() => this._clientConfiguration = undefined);
		this.connection.listen();
	}

	get clientConfiguration(): Promise<ClientConfiguration> {
		// Helper function to get the configuration from the client.
		const getConfig = async (): Promise<ClientConfiguration> => await this.connection
			.workspace.getConfiguration('vbaLanguageServer');

		// Ensure we have configuration by getting it if we don't.
		const ensureConfig = async (): Promise<void> => {
			if (!this._clientConfiguration) this._clientConfiguration = await getConfig();
		};

		return (async (): Promise<ClientConfiguration> => {
			await ensureConfig();
			return this._clientConfiguration!;
		})();
	}
}


export class LanguageServerConfiguration {
	capabilities: ServerCapabilities<any> = {
		// Implemented
		documentSymbolProvider: true,
		foldingRangeProvider: true,
		textDocumentSync: TextDocumentSyncKind.Incremental,
		// diagnosticProvider: {
		// 	interFileDependencies: false,
		// 	workspaceDiagnostics: false
		// },

		// Implement soon.
		codeActionProvider: true,
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
		documentFormattingProvider: true,
		documentRangeFormattingProvider: false,
		documentOnTypeFormattingProvider: undefined,
		renameProvider: true,
		selectionRangeProvider: false,
		executeCommandProvider: undefined,
		callHierarchyProvider: false,
		linkedEditingRangeProvider: false,
		workspace: undefined,
		monikerProvider: false,
		experimental: undefined,
	};

	constructor(public params: InitializeParams) { }
}


class ConnectionInitializeResult implements InitializeResult {
	[custom: string]: any;
	capabilities: ServerCapabilities<any>;
	serverInfo?: { name: string; version?: string; };

	constructor(capabilities: ServerCapabilities) {
		this.capabilities = capabilities;
	}
}


Services.registerServices();
Services.registerServer(new LanguageServer());
const languageServer = Services.server;
