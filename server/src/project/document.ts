// Core
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { CancellationToken, Diagnostic, DocumentDiagnosticReport, DocumentDiagnosticReportKind, SymbolInformation, SymbolKind } from 'vscode-languageserver';

// Antlr
import { ParseCancellationException, ParserRuleContext } from 'antlr4ng';

// Project
import { Workspace } from './workspace';
import { Dictionary } from '../utils/helpers';
import { SyntaxParser } from './parser/vbaParser';
import { FoldingRange } from '../capabilities/folding';
import { SemanticTokensManager } from '../capabilities/semanticTokens';
import { BaseContextSyntaxElement,
	BaseSyntaxElement,
	DeclarableElement,
	HasDiagnosticCapability,
	HasFoldingRangeCapability,
	HasSemanticTokenCapability,
	HasSymbolInformationCapability
} from './elements/base';

import { PropertyDeclarationElement,
	PropertyGetDeclarationElement,
	PropertyLetDeclarationElement,
	PropertySetDeclarationElement
} from './elements/procedure';
import { VbaFmtListener } from './parser/vbaListener';


export interface DocumentSettings {
	maxDocumentLines: number;
	maxNumberOfProblems: number;
	doWarnOptionExplicitMissing: boolean;
	environment: {
		os: string;
		version: string;
	}
}


// TODO ---------------------------------------------
//	* Create a special register property that registers the name
//    normally and tracks to avoid readding duplicates (unless we have two gets).
//    Consider making all variables get/set/let for simplicity in assignment.
//    Obviously Const will only have a get.
//  * Fix the rest of the scope and variable bits.
// 	* Write tests for it all.
// --------------------------------------------------


export abstract class BaseProjectDocument {
	readonly name: string;
	readonly workspace: Workspace;
	readonly textDocument: TextDocument;

	protected diagnostics: Diagnostic[] = [];
	protected documentConfiguration?: DocumentSettings;
	protected documentScopeDeclarations: Map<string, Map<string, any>> = new Map();
	protected foldableElements: FoldingRange[] = [];
	protected hasDiagnosticElements: HasDiagnosticCapability[] = [];
	protected properties: Dictionary<string, PropertyDeclarationElement> = new Dictionary(() => new PropertyDeclarationElement());
	protected redactedElements: BaseContextSyntaxElement<ParserRuleContext>[] = [];
	protected semanticTokens: SemanticTokensManager = new SemanticTokensManager();
	protected symbolInformations: SymbolInformation[] = [];
	protected unhandledNamedElements: [] = [];
	
	abstract symbolKind: SymbolKind
	
	protected _isBusy = true;
	get isBusy() { return this._isBusy; }

	get isOversize() {
		// Workaround for async getter.
		return (async () =>
			this.textDocument.lineCount > (await this.getDocumentConfiguration()).maxDocumentLines
		)();
	}

	get redactedText() {
		return this.subtractTextFromRanges(this.redactedElements.map(x => x.context.range));
	}

	async getDocumentConfiguration(): Promise<DocumentSettings> {
		// Get the stored configuration.
		if (this.documentConfiguration) {
			return this.documentConfiguration;
		}
		
		// Get the configuration from the client.
		if (this.workspace.hasConfigurationCapability) {
			this.documentConfiguration = await this.workspace.requestDocumentSettings(this.textDocument.uri);
			if (this.documentConfiguration) {
				return this.documentConfiguration;
			}
		}

		// Use the defaults.
		this.documentConfiguration = {
			maxDocumentLines: 1500,
			maxNumberOfProblems: 100,
			doWarnOptionExplicitMissing: true,
			environment: {
				os: "Win64",
				version: "Vba7"
			}
		};
		return this.documentConfiguration;
	}

	clearDocumentConfiguration = () => this.documentConfiguration = undefined;

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
		return this.semanticTokens.getSemanticTokens(range);
	};

	languageServerFoldingRanges(): FoldingRange[] {
		return this.foldableElements;
	}

	languageServerSymbolInformation(): SymbolInformation[] {
		return this.symbolInformations;
	}

	languageServerDiagnostics(): DocumentDiagnosticReport {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: this.diagnostics
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
			this.workspace.logger.debug(`Document oversize: ${this.textDocument.lineCount} lines.`);
            this.workspace.logger.warn(`Syntax parsing has been disabled to prevent crashing.`);
			this._isBusy = false;
			return;
		}

		// Parse the document.
		await (new SyntaxParser()).parseAsync(this);

		// Evaluate the diagnostics.
		this.diagnostics = this.hasDiagnosticElements
			.map(e => e.diagnosticCapability.evaluate())
			.flat();

		this._isBusy = false;
	};

	async formatParseAsync(token: CancellationToken): Promise<VbaFmtListener | undefined> {
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
			this.workspace.logger.debug(`Document oversize: ${this.textDocument.lineCount} lines.`);
            this.workspace.logger.warn(`Syntax parsing has been disabled to prevent crashing.`);
			return;
		}

		// Parse the document.
		return await (new SyntaxParser()).formatParseAsync(this);
	}

	/**
	 * Auto registers the element based on capabilities.
	 * @returns This for chaining.
	 */
	registerElement<T extends ParserRuleContext>(element: BaseSyntaxElement<T>) {
		if (!!element.diagnosticCapability) this.registerDiagnosticElement(element as HasDiagnosticCapability);
		if (!!element.foldingRangeCapability) this.registerFoldableElement(element as HasFoldingRangeCapability);
		if (!!element.semanticTokenCapability) this.registerSemanticToken(element as HasSemanticTokenCapability);
		if (!!element.symbolInformationCapability) this.registerSymbolInformation(element as HasSymbolInformationCapability);
		return this;
	}

	registerPropertyElementDeclaration(element: PropertyGetDeclarationElement | PropertySetDeclarationElement | PropertyLetDeclarationElement) {
		const elementName = element.propertyName;
		this.properties.getOrSet(elementName)
			.addPropertyDeclaration(element);
		return this;
	}

	registerNamedElementDeclaration(element: DeclarableElement) {
		this.workspace.namespaceManager.addNameItem(element);
		return this;
	}

	registerNamespaceElement(element: DeclarableElement) {
		this.workspace.namespaceManager.addNamespace(element);
		return this;
	}

	deregisterNamespaceElement() {
		this.workspace.namespaceManager.popNamespace();
		return this;
	}

	registerDiagnosticElement(element: HasDiagnosticCapability) {
		this.hasDiagnosticElements.push(element);
		return this;
	}

	registerFoldableElement = (element: HasFoldingRangeCapability) => {
		this.foldableElements.push(element.foldingRangeCapability.foldingRange);
		return this;
	};

	/**
	 * Registers a semantic token element for tracking with the SemanticTokenManager.
	 * @param element element The element that has a semantic token.
	 * @returns this for chaining.
	 */
	registerSemanticToken = (element: HasSemanticTokenCapability) => {
		this.semanticTokens.add(element);
		return this;
	}

	registerSubtractElement = (element: BaseContextSyntaxElement<ParserRuleContext>) => {
		this.redactedElements.push(element);
		return this;
	}

	/**
	 * Registers a SymbolInformation.
	 * @param element The element that has symbol information.
	 * @returns this for chaining.
	 */
	registerSymbolInformation = (element: HasSymbolInformationCapability) => {
		this.symbolInformations.push(element.symbolInformationCapability.SymbolInformation);
		return this;
	}


	private subtractTextFromRanges(ranges: Range[]): string {
		const text = this.textDocument.getText();
		return ranges.reduce((x, y) => this.subtractTextRange(x, y), text);
	}

	/**
	 * Subtracts text by replacing it with white space.
	 * @param text the text to act on.
	 * @param range the range to subtract.
	 * @returns the original text with the range replaced by spaces.
	 */
	private subtractTextRange(text: string, range: Range): string {
		const docLines = text.split('\r\n');

		if (range.start.line === range.end.line) {
			// When the start and end lines are the same, subtract a substring.
			const x = range.end.character;
			const y = range.start.character;
			const i = range.start.line - 1;
			const line = docLines[i];
			const subtraction = ' '.repeat(x - y + 1);
			docLines[i] = line.slice(0, y) + subtraction + line.slice(x + 1);
			return docLines.join('\r\n');
		} else {
			// When they aren't, subtract whole lines between start and end.
			const x = range.end.line;
			const y = range.start.line;

			// Replace the subtracted lines with spaces to maintain individual
			// character positional integrity.
			const result = docLines.map((line, i) =>
				i >= y && i < x ? ' '.repeat(line.length) : line
			);
			return result.join('\r\n')
		}
	}
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
