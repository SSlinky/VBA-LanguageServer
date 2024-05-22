import { CompletionItem, CompletionParams, DidChangeConfigurationNotification, DidChangeConfigurationParams, DidChangeWatchedFilesParams, DocumentSymbolParams, FoldingRange, FoldingRangeParams, Hover, HoverParams, SymbolInformation, WorkspaceFoldersChangeEvent, _Connection } from 'vscode-languageserver';
import { IProjectDocument } from './document';
import { LanguageServerConfiguration } from '../server';
import { sleep } from '../utils/helpers';
import { hasConfigurationCapability } from '../capabilities/workspaceFolder';


/**
 * Organises project documents and runs actions
 * at a workspace level.
 */
export class Workspace {
	private events: WorkspaceEvents;
	private documents: IProjectDocument[] = [];
	private publicScopeDeclarations: Map<string, any> = new Map();
	
	readonly connection: _Connection;

	// constructor(connection: _Connection, capabilities: LanguageServerCapabilities) {
	constructor(params: {connection: _Connection, capabilities: LanguageServerConfiguration}) {
		this.connection = params.connection;
		this.events = new WorkspaceEvents({
			workspace: this,
			connection: params.connection,
			configuration: params.capabilities,
		});
	}

	/**
	 * Registers a declaration or pushes an ambiguous name diagnostic.
	 */
	registerNamedElementDeclaration(element: any) {
		// Check document names for existing entry.
		// Check for public scope for existing entry.

		throw new Error("Not implemented");
	}

	/**
	 * Pushes an overriding name diagnostic if overriding public scope.
	 * @param element The element to check.
	 */
	checkNamedElementDeclaration(element: any) {
		throw new Error("Not implemented");
	}

}

class WorkspaceEvents {
	readonly workspace: Workspace;
	readonly configuration: LanguageServerConfiguration;

	constructor(params: {connection: _Connection, workspace: Workspace, configuration: LanguageServerConfiguration}) {
		this.workspace = params.workspace;
		this.configuration = params.configuration;
		this.initialiseConnectionEvents(params.connection);
	}

	private initialiseConnectionEvents(connection: _Connection) {
		connection.onInitialized(() => this.onInitialized());
		connection.onCompletion(params => this.onCompletion(params));
		connection.onCompletionResolve(item => this.onCompletionResolve(item));
		connection.onDidChangeConfiguration(params => this.onDidChangeConfiguration(params));
		connection.onDidChangeWatchedFiles(params => this.onDidChangeWatchedFiles(params));
		connection.onDocumentSymbol((params) => this.onDocumentSymbolAsync(params));
		connection.onHover(params => this.onHover(params));

		if (hasConfigurationCapability(this.configuration)) {
			connection.onFoldingRanges((params) => this.onFoldingRanges(params));
		}

		connection.onRequest((method: string, params: object | object[] | any) => {
			switch (method) {
				case 'textDocument/semanticTokens/full': {
					// const stp = params as SemanticTokensParams;
					// return docInfo.getSemanticTokens(stp);
					break;
				}
				case 'textDocument/semanticTokens/range':
					// return docInfo.getSemanticTokens(params);
					break;
				default:
					// console.error(`Unresolved request path: ${method}`);
			}
		});
	}

	/** Connection event handlers */

	private onCompletion(params: CompletionParams): never[] {
		console.log('onCompletion: ' + params);
		return [];
	}

	private onCompletionResolve(item: CompletionItem): CompletionItem {
		console.log('onCompletionResolve: ' + item.label);
		return item;
	}

	private onDidChangeConfiguration(params: DidChangeConfigurationParams): void {
		console.log('onDidChangeConfiguration: ' + params);
	}

	private onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
		console.log('onDidChangeWatchedFiles: ' + params);
	}

	// TODO: Should trigger a full workspace refresh.
	private onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
		console.log('onDidChangeWorkspaceFolders: ' + e);
		this.workspace.connection.console.log('Workspace folder change event received.\n' + e);
	}

	private async onDocumentSymbolAsync(params: DocumentSymbolParams): Promise<SymbolInformation[]> {
		console.log(`onDocumentSymbolAsync: ${params.textDocument.uri}`);
		return await this.activeDocument?.languageServerSymbolInformationAsync() ?? [];
	}

	private onFoldingRanges(params: FoldingRangeParams): FoldingRange[] {
		const foldingRanges = this._workspace.activeDocument?.foldableElements ?? [];
		console.log(`onFoldingRanges: ${params.textDocument.uri} (${foldingRanges.length} ranges)`);
		return foldingRanges;
	}

	private onHover(params: HoverParams): Hover {
		console.log('onHover: ' + params.position.line + ',' + params.position.character);
		return { contents: '' };
	}

	private onInitialized(): void {
		console.log('onInitialized:---');
		const connection = this.workspace.connection;
		// Register for client configuration notification changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);

		// This is how we can listen for changes to workspace folders.
		if (hasConfigurationCapability(this.configuration)) {
			connection.workspace.onDidChangeWorkspaceFolders(e =>
				this.onDidChangeWorkspaceFolders(e)
			);
		}
	}
}