import { CancellationToken, Diagnostic, PublishDiagnosticsParams, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { Workspace } from './workspace';
import { FoldableElement } from './elements/special';
import { HasDiagnosticCapability, HasSemanticToken, HasSymbolInformation, IdentifiableSyntaxElement, ScopeElement } from './elements/base';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { SyntaxParser } from './parser/vbaSyntaxParser';
import { FoldingRange } from '../capabilities/folding';
import { SemanticTokensManager } from '../capabilities/semanticTokens';

export interface DocumentSettings {
	maxDocumentLines: number;
	maxNumberOfProblems: number;
	doWarnOptionExplicitMissing: boolean;
}

export abstract class BaseProjectDocument {
	readonly name: string;
	readonly workspace: Workspace;
	readonly textDocument: TextDocument;
	protected _documentConfiguration?: DocumentSettings;
	
	protected _hasDiagnosticElements: HasDiagnosticCapability[] = [];
	protected _unhandledNamedElements: [] = [];
	protected _publicScopeDeclarations: Map<string, any> = new Map();
	protected _documentScopeDeclarations: Map<string, Map<string, any>> = new Map();
	
	protected _diagnostics: Diagnostic[] = [];
	protected _elementParents: ScopeElement[] = [];
	// protected _attributeElements: HasAttribute[] = [];
	protected _foldableElements: FoldingRange[] = [];
	protected _symbolInformations: SymbolInformation[] = [];
	protected _semanticTokens: SemanticTokensManager = new SemanticTokensManager();
	
	protected _isBusy = true;
	// protected _hasParseResult = false;
	abstract symbolKind: SymbolKind

	get isBusy() {
		return this._isBusy;
	}

	get isOversize() {
		// Workaround for async getter.
		return (async () =>
			this.textDocument.lineCount > (await this.getDocumentConfiguration()).maxDocumentLines
		)();
	}

	// get hasParseResult() {
	// 	return this._hasParseResult;
	// }

	get currentScopeElement() {
		return this._elementParents.at(-1);
	}

	async getDocumentConfiguration(): Promise<DocumentSettings> {
		// Get the stored configuration.
		if (this._documentConfiguration) {
			return this._documentConfiguration;
		}
		
		// Get the configuration from the client.
		if (this.workspace.hasConfigurationCapability) {
			this._documentConfiguration = await this.workspace.requestDocumentSettings(this.textDocument.uri);
			if (this._documentConfiguration) {
				return this._documentConfiguration;
			}
		}

		// Use the defaults.
		this._documentConfiguration = {
			maxDocumentLines: 1500,
			maxNumberOfProblems: 100,
			doWarnOptionExplicitMissing: true,
		};
		return this._documentConfiguration;
	}

	clearDocumentConfiguration = () => this._documentConfiguration = undefined;
	
	// get activeAttributeElement() {
	// 	return this._attributeElements?.at(-1);
	// }

	constructor(workspace: Workspace, name: string, document: TextDocument) {
		this.textDocument = document;
		this.workspace = workspace;
		this.name = name;
	}

	static create(workspace: Workspace, document: TextDocument): BaseProjectDocument {
		const slashParts = document.uri.split('/').at(-1);
		const dotParts = slashParts?.split('.');
		const extension = dotParts?.at(-1);
		const filename = dotParts?.join('.');

		if (!filename || !extension) {
			throw new Error("Unable to parse document uri");
		}

		switch (extension) {
			case 'cls':
				return new VbaClassDocument(workspace, filename, document, SymbolKind.Class);
			case 'bas':
				return new VbaModuleDocument(workspace, filename, document, SymbolKind.Class);
			case 'frm':
				return new VbaModuleDocument(workspace, filename, document, SymbolKind.Class);
			default:
				throw new Error("Expected *.cls, *.bas, or *.frm but got *." + extension);
		}
	}

	languageServerSemanticTokens = (range?: Range) => {
		return this._semanticTokens.getSemanticTokens(range);
	};

	languageServerFoldingRanges(): FoldingRange[] {
		return this._foldableElements;
	}

	languageServerSymbolInformation(): SymbolInformation[] {
		return this._symbolInformations;
	}

	languageServerDiagnostics(): PublishDiagnosticsParams {
		this._hasDiagnosticElements.forEach(e =>
			e.evaluateDiagnostics()
		);
		return {
			uri: this.textDocument.uri,
			diagnostics: this._hasDiagnosticElements
				.map((e) => e.diagnostics).flat(1) };
	}

	async parseAsync(token: CancellationToken): Promise<void> {
		if (await this.isOversize) {
			console.log(`Document oversize: ${this.textDocument.lineCount} lines.`);
            console.warn(`Syntax parsing has been disabled to prevent crashing.`);
			this._isBusy = false;
			return;
		}
		await (new SyntaxParser()).parseAsync(this, token)
		this._hasDiagnosticElements.forEach(element => {
			element.evaluateDiagnostics;
			this._diagnostics.concat(element.diagnostics);
		});
		this._isBusy = false;
	};

	registerNamedElementDeclaration(element: any) {
		// Check workspace if public.
		// Check for existing entry in local scope.
		// Check for overriding name in method (if relevant)
		// Check for overriding name in document scope.
		// Check for overriding name in workspace.
		throw new Error("Not implemented");
	}

	registerDiagnosticElement(element: HasDiagnosticCapability) {
		this._hasDiagnosticElements.push(element);
		return this;
	}

	/**
	 * Pushes an element to the attribute elements stack.
	 * Be careful to pair a register action with an appropriate deregister.
	 * @param element the element to register.
	 * @returns nothing of interest.
	 */
	// registerAttributeElement = (element: HasAttribute) => {
	// 	this._attributeElements.push(element);
	// 	return this;
	// };

	/**
	 * Pops an element from the attribute elements stack.
	 * Popping allows actions to be performed on the same element,
	 * e.g., registered in the entry event and deregistered in the exit event.
	 * @param element the element to register.
	 * @returns the element at the end of the stack.
	 */
	// deregisterAttributeElement = () => {
	// 	return this._attributeElements.pop();
	// };

	registerFoldableElement = (element: FoldableElement) => {
		this._foldableElements.push(new FoldingRange(element));
		return this;
	};

	registerNamedElement(element: IdentifiableSyntaxElement) {
		this.currentScopeElement?.pushDeclaredName(element);
		return this;
	}

	/**
	 * Registers an element as a parent to be attached to subsequent elemements.
	 * Should be called when the parser context is entered and matched with
	 * deregisterScopedElement when the context exits.
	 * @param element the element to register.
	 * @returns this for chaining.
	 */
	registerScopedElement(element: ScopeElement) {
		this._elementParents.push(element);
		return this;
	}

	/**
	 * Deregisters an element as a parent so it isn't attached to subsequent elemements.
	 * Should be called when the parser context is exited and matched with
	 * deregisterScopedElement when the context is entered.
	 * @returns this for chaining.
	 */
	deregisterScopedElement = () => {
		this._elementParents.pop();
		return this;
	};

	/**
	 * Registers a semantic token element for tracking with the SemanticTokenManager.
	 * @param element element The element that has a semantic token.
	 * @returns this for chaining.
	 */
	registerSemanticToken = (element: HasSemanticToken) => {
		this._semanticTokens.add(element);
		return this;
	};

	/**
	 * Registers a SymbolInformation.
	 * @param element The element that has symbol information.
	 * @returns this for chaining.
	 */
	registerSymbolInformation = (element: HasSymbolInformation) => {
		this._symbolInformations.push(element.symbolInformation);
		return this;
	};
}


export class VbaClassDocument extends BaseProjectDocument {
	symbolKind: SymbolKind;
	constructor(workspace: Workspace, name: string, document: TextDocument, symbolKind: SymbolKind) {
		super(workspace, name, document);
		this.symbolKind = symbolKind;
	}
}


export class VbaModuleDocument extends BaseProjectDocument {
	symbolKind: SymbolKind;
	constructor(workspace: Workspace, name: string, document: TextDocument, symbolKind: SymbolKind) {
		super(workspace, name, document);
		this.symbolKind = symbolKind;
	}
}
