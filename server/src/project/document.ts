import { Diagnostic, SemanticTokens, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { Workspace } from './workspace';
import { FoldableElement } from './elements/special';
import { BaseSyntaxElement, HasAttribute, HasSemanticToken, HasSymbolInformation } from './elements/base';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { SyntaxParser } from './parser/vbaSyntaxParser';
import { FoldingRange } from '../capabilities/folding';
import { SemanticTokensManager } from '../capabilities/semanticTokens';
import { sleep } from '../utils/helpers';


export interface ProjectDocument {
	name: string;
	textDocument: TextDocument;
	languageServerSemanticTokens: (range?: Range) => SemanticTokens | null;
	languageServerSymbolInformationAsync(): Promise<SymbolInformation[]>;
	get foldableElements(): FoldingRange[];
	parseAsync(): Promise<void>;
}


export abstract class BaseProjectDocument implements ProjectDocument {
	readonly workspace: Workspace;
	readonly textDocument: TextDocument;
	readonly name: string;
	
	protected _unhandledNamedElements: [] = [];
	protected _publicScopeDeclarations: Map<string, any> = new Map();
	protected _documentScopeDeclarations: Map<string, Map<string, any>> = new Map();
	
	protected _diagnostics: Diagnostic[] = [];
	protected _elementParents: BaseSyntaxElement[] = [];
	protected _attributeElements: HasAttribute[] = [];
	protected _foldableElements: FoldingRange[] = [];
	protected _symbolInformations: SymbolInformation[] = [];
	protected _semanticTokens: SemanticTokensManager = new SemanticTokensManager();
	
	isBusy = false;
	private _requestId = 0;
	abstract symbolKind: SymbolKind

	get foldableElements() {
		return this._foldableElements;
	}

	get activeAttributeElement() {
		return this._attributeElements?.at(-1);
	}

	constructor(workspace: Workspace, name: string, document: TextDocument) {
		this.textDocument = document;
		this.workspace = workspace;
		this.name = name;
	}

	static create(workspace: Workspace, document: TextDocument): VbaClassDocument | VbaModuleDocument {
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
			default:
				throw new Error("Expected *.cls or *.bas but got *." + extension);
		}
	}

	languageServerSemanticTokens = (range?: Range) => {
		return this._semanticTokens.getSemanticTokens(range);
	};

	async languageServerSymbolInformationAsync(): Promise<SymbolInformation[]> {
		this._requestId += 1;
		const requestId = this._requestId;
		while (this.isBusy) {
			await sleep(5);
			if (requestId < this._requestId) {
				return [];
			}
		}
		this._requestId = 0;
		return this._symbolInformations;
	}

	parseAsync = async (): Promise<void> => {
		this.isBusy = true;
		console.log('Parsing document');
		await (new SyntaxParser()).parseAsync(this);
		this.isBusy = false;
	};

	registerNamedElementDeclaration(element: any) {
		// Check workspace if public.
		// Check for existing entry in local scope.
		// Check for overriding name in method (if relevant)
		// Check for overriding name in document scope.
		// Check for overriding name in workspace.
		throw new Error("Not implemented");
	}

	/**
	 * Pushes an element to the attribute elements stack.
	 * Be careful to pair a register action with an appropriate deregister.
	 * @param element the element to register.
	 * @returns nothing of interest.
	 */
	registerAttributeElement = (element: HasAttribute) => {
		this._attributeElements.push(element);
		return this;
	};

	/**
	 * Pops an element from the attribute elements stack.
	 * Popping allows actions to be performed on the same element,
	 * e.g., registered in the entry event and deregistered in the exit event.
	 * @param element the element to register.
	 * @returns the element at the end of the stack.
	 */
	deregisterAttributeElement = () => {
		return this._attributeElements.pop();
	};

	registerFoldableElement = (element: FoldableElement) => {
		this._foldableElements.push(new FoldingRange(element));
		return this;
	};

	registerNamedElement(element: BaseSyntaxElement) {
		return this;
	}

	/**
	 * Registers an element as a parent to be attached to subsequent elemements.
	 * Should be called when the parser context is entered and matched with
	 * deregisterScopedElement when the context exits.
	 * @param element the element to register.
	 * @returns this for chaining.
	 */
	registerScopedElement(element: BaseSyntaxElement) {
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
	 * @returns void.
	 */
	registerSemanticToken = (element: HasSemanticToken): void => {
		this._semanticTokens.add(element);
	};

	/**
	 * Registers a SymbolInformation.
	 * @param element The element that has symbol information.
	 * @returns a number for some reason.
	 */
	registerSymbolInformation = (element: HasSymbolInformation): number => {
		console.debug(`Registering symbol for ${element.symbolInformation.name}`);
		return this._symbolInformations.push(element.symbolInformation);
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
