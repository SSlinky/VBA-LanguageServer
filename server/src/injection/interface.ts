import { LanguageServerConfiguration } from '../server';
import { BaseProjectDocument } from '../project/document';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { VbaFmtListener } from '../project/parser/vbaListener';
import { NamespaceManager } from '../project/scope';
import { CancellationToken } from 'vscode-languageserver';

export interface Logger {
	error(msg: string, lvl?: number): void;
	warn(msg: string, lvl?: number): void;
	info(msg: string, lvl?: number): void;
	log(msg: string, lvl?: number): void;
	debug(msg: string, lvl?: number): void;
	stack(e: Error): void;
}

export interface ClientConfiguration {
	maxDocumentLines: number;
	maxNumberOfProblems: number;
	doWarnOptionExplicitMissing: boolean;
	environment: {
		os: string;
		version: string;
	}
	logLevel: {
		outputChannel: string;
	}
}

export interface ILanguageServer {
	// configuration?: {
	// 	params: InitializeParams
	// }
	configuration?: LanguageServerConfiguration; // TOTO interface
	get clientConfiguration(): Promise<ClientConfiguration>
}

export interface IWorkspace {
	clearDocumentsConfiguration(): void
	formatParseDocument(document: TextDocument, token: CancellationToken): Promise<VbaFmtListener | undefined>;
	parseDocument(projectDocument: BaseProjectDocument): Promise<void>;
	openDocument(document: TextDocument): void;
	closeDocument(document: TextDocument): void;
	namespaceManager: NamespaceManager;
}