import { CancellationToken, Diagnostic, DocumentDiagnosticReport, DocumentDiagnosticReportKind, PublishDiagnosticsParams, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { Workspace } from './workspace';
import { FoldableElement, IdentifiableScopeElement } from './elements/special';
import { DeclarationElement, HasDiagnosticCapability, HasSemanticToken, HasSymbolInformation, IdentifiableSyntaxElement } from './elements/base';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { SyntaxParser } from './parser/vbaSyntaxParser';
import { FoldingRange } from '../capabilities/folding';
import { SemanticTokensManager } from '../capabilities/semanticTokens';
import { ParseCancellationException } from 'antlr4ng';
import { Scope } from './scope';
import { DuplicateDeclarationDiagnostic, ShadowDeclarationDiagnostic } from '../capabilities/diagnostics';

export interface DocumentSettings {
	maxDocumentLines: number;
	maxNumberOfProblems: number;
	doWarnOptionExplicitMissing: boolean;
	environment: {
		os: string;
		version: string;
	}
}

export abstract class BaseProjectDocument {
	readonly name: string;
	readonly workspace: Workspace;
	readonly textDocument: TextDocument;
	protected _documentConfiguration?: DocumentSettings;
	
	protected _hasDiagnosticElements: HasDiagnosticCapability[] = [];
	protected _unhandledNamedElements: [] = [];
	// protected _publicScopeDeclarations: Map<string, any> = new Map();
	protected _documentScopeDeclarations: Map<string, Map<string, any>> = new Map();
	
	protected _diagnostics: Diagnostic[] = [];
	protected _elementParents: Scope[] = [];
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
		return this._elementParents.at(-1) ?? this.workspace.globalScope;
	}

	get moduleScope() {
		const scope = this._elementParents.at(0);
		if (!scope) {
			throw new Error("Expected module scope!");
		}

		return scope;
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
			environment: {
				os: "Win64",
				version: "Vba7"
			}
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

	languageServerDiagnostics(): DocumentDiagnosticReport {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: this._hasDiagnosticElements
				.map((e) => e.diagnostics).flat(1)
		};
	}

	async parseAsync(token: CancellationToken): Promise<void> {
		// Handle already cancelled.
		if (token.isCancellationRequested) {
			throw new ParseCancellationException(Error('Parse operation cancelled before it started.'));
		}

		// Listen for cancellation event.
		token.onCancellationRequested(() => {
			throw new ParseCancellationException(new Error('Parse operation cancelled during parse.'));
		})

		// Don't parse oversize documents.
		if (await this.isOversize) {
			console.log(`Document oversize: ${this.textDocument.lineCount} lines.`);
            console.warn(`Syntax parsing has been disabled to prevent crashing.`);
			this._isBusy = false;
			return;
		}

		// Parse the document.
		await (new SyntaxParser()).parseAsync(this)

		// Evaluate the diagnostics.
		this._hasDiagnosticElements.forEach(element => {
			element.evaluateDiagnostics;
			this._diagnostics.concat(element.diagnostics);
		});
		this._isBusy = false;
	};

	registerNamedElementDeclaration(element: IdentifiableScopeElement) {
		const scope = element.isPublic ? this.workspace.globalScope : this.currentScopeElement;

		// Check for duplicate declarations
		if (!!scope.declaredNames.has(element.name)) {
			element.diagnostics.push(new DuplicateDeclarationDiagnostic(element.identifier.range))
		}

		// Check for variable shadowing.
		// TODO: This doesn't work for vars declared at a higher level AFTER the lower level.
		// e.g.: Private Const FOO
		//		 Public Const FOO
		if (!!scope.parentScope?.findDeclaration(element.name)) {
			element.diagnostics.push(new ShadowDeclarationDiagnostic(element.identifier.range))
		}
		
		scope.pushDeclaredName(element);
		return this;
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

	registerPublicNamedElement(element: DeclarationElement) {
		this.workspace.globalScope.pushDeclaredName(element);
		return this;
	}

	registerNamedElement(element: DeclarationElement) {
		this.currentScopeElement?.pushDeclaredName(element);
		return this;
	}

	/**
	 * Registers scope as a parent to be attached to subsequent elemements.
	 * Should be called when the parser context is entered and matched with
	 * deregisterScope when the context exits.
	 * @param scope the element to register.
	 * @returns the registered scope.
	 */
	registerScope(): Scope {
		const parent = this.currentScopeElement;
		const scope = new Scope(parent);
		
		parent.children.push(scope)
		this._elementParents.push(scope);
		return scope;
	}

	/**
	 * Deregisters a scope as a parent so it isn't attached to subsequent elemements.
	 * Should be called when the parser context is exited and matched with
	 * registerScope when the context is entered.
	 * @returns this for chaining.
	 */
	deregisterScope = () => {
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
