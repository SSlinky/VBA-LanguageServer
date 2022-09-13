import { CompletionItem, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DidChangeConfigurationParams, DidChangeWatchedFilesParams, DocumentSymbol, FoldingRange, Hover, HoverParams, Location, NotificationHandler, Position, Range, SemanticTokenModifiers, SemanticTokens, SemanticTokensParams, SemanticTokensRangeParams, SemanticTokensRequest, SymbolInformation, SymbolKind, TextDocumentPositionParams, TextDocuments, uinteger, _Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LiteralContext } from './antlr/out/vbaParser';
import { SemanticToken, sortSemanticTokens } from './capabilities/vbaSemanticTokens';
import {  sleep, rangeIsChildOfElement } from './utils/helpers';
import { IdentifierElement, MethodElement, ModuleAttribute, ModuleElement, SyntaxElement, VariableAssignElement, VariableDeclarationElement, VariableStatementElement } from './utils/vbaSyntaxElements';
import { ResultsContainer, SyntaxParser } from './utils/vbaSyntaxParser';


declare global {
	interface Map<K, V> {
		has<P extends K>(key: P): this is { get(key: P): V } & this
	}
}

interface ExampleSettings {
	maxNumberOfProblems: number;
}


enum NameLinkType {
	'variable' = 0,
	'method' = 1,
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

export class ProjectInformation {
	readonly conn: _Connection;
	readonly docs: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
	readonly docInfos: Map<string, DocumentInformation> = new Map();
	readonly docSettings: Map<string, Thenable<ExampleSettings>> = new Map();

	private hasConfigurationCapability = false;
	private hasWorkspaceFolderCapability = false;
	private hasDiagnosticRelatedInformationCapability = false;

	private readonly syntaxUtil: SyntaxParser;
	private readonly scopes: Scope = new Scope();

	constructor(conn: _Connection, hasCfg: boolean, hasWsFld: boolean, hasDiag: boolean) {
		this.conn = conn;
		this.syntaxUtil = new SyntaxParser();
		this.hasConfigurationCapability = hasCfg;
		this.hasWorkspaceFolderCapability = hasWsFld;
		this.hasDiagnosticRelatedInformationCapability = hasDiag;
		this.addEventHandlers();

		this.docs.listen(conn);
	}


	onDidChangeConfiguration: NotificationHandler<DidChangeConfigurationParams> = (change => {
		if (this.hasConfigurationCapability) {
			this.docSettings.clear();
		} else {
			globalSettings = <ExampleSettings>(
				(change.settings.languageServerExample || defaultSettings)
			);
		}

		// Revalidate all open text documents
		// this.docs.all().forEach(validateTextDocument);
	});

	onDidChangeWatchedFiles: NotificationHandler<DidChangeWatchedFilesParams> = (params) => {
		this.conn.console.log(`onDidChangeWatchedFiles: ${params}`);
	};

	getFoldingRanges(docUri: string) {
		return this.docInfos.get(docUri)?.getFoldingRanges() ?? [];
	}

	async getDocumentSymbols(docUri: string) {
		const docInfo = this.docInfos.get(docUri);
		if (docInfo) {
			while (docInfo.isBusy) {
				await sleep(50);
			}
		}
		return [];
	}

	// TODO: Implement
	getCompletion(params: TextDocumentPositionParams) {
		return [];
	}

	// TODO: Implement
	getCompletionResolve(item: CompletionItem): CompletionItem {
		return item;
	}

	getHover({ textDocument, position }: HoverParams): Hover {
		return this.docInfos.get(textDocument.uri)?.getHover(position) ?? { contents: '' };
	}

	getSemanticTokens(f: SemanticTokensParams): SemanticTokens | null;
	getSemanticTokens(r: SemanticTokensRangeParams): SemanticTokens | null;
	getSemanticTokens(f?: SemanticTokensParams, r?: SemanticTokensRangeParams): SemanticTokens | null {
		const range = r?.range;
		const uri = f?.textDocument?.uri ?? r?.textDocument?.uri ?? '';
		return this.docInfos.get(uri)?.getSemanticTokens(range) ?? null;
	}



	private getDocumentSettings(docUri: string): Thenable<ExampleSettings> {
		if (!this.hasConfigurationCapability) {
			return Promise.resolve(globalSettings);
		}
		let result = this.docSettings.get(docUri);
		if (!result) {
			result = this.conn.workspace.getConfiguration({
				scopeUri: docUri,
				section: 'vbaLanguageServer'
			});
			this.docSettings.set(docUri, result);
		}
		return result;
	}

	private async addEventHandlers() {
		this.docs.onDidClose(e => {
			this.docSettings.delete(e.document.uri);
		});

		this.docs.onDidOpen(async e => {
			const uri = e.document.uri;
			const stg = await this.getDocumentSettings(uri);
			this.docSettings.set(uri, Promise.resolve(stg));
		});

		this.docs.onDidChangeContent(change => {
			const doc = change.document;
			const docInfo = new DocumentInformation(this.scopes, doc.uri);
			this.docInfos.set(doc.uri, docInfo);
			this.syntaxUtil.parse(doc, docInfo);
			docInfo.finalise();
		});
	}
}

export class DocumentInformation implements ResultsContainer {
	module?: ModuleElement;
	elements: SyntaxElement[] = [];
	attrubutes: Map<string, string> = new Map();
	isBusy = true;

	private ancestors: SyntaxElement[] = [];
	private localNames: Map<string, SyntaxElement> = new Map();
	private documentScope: Scope;
	private docUri: string;

	constructor(scope: Scope, docUri: string) {
		scope.links.set(docUri, new Map());
		this.documentScope = scope;
		this.docUri = docUri;
	}

	addModule(emt: ModuleElement) {
		this.module = emt;
		this.elements.push(emt);
		this.ancestors.push(emt);
	}

	addElement(emt: SyntaxElement) {
		while (this.ancestors) {
			const pnt = this.ancestors.pop()!;
			if (emt.isChildOf(pnt)) {
				emt.parent = pnt;
				pnt.children.push(emt);
				this.ancestors.push(pnt);
				this.ancestors.push(emt);
				emt.fqName = pnt.fqName;
				break;
			}
		}
		this.elements.push(emt);
		this.ancestors.push(emt);
		const x = 3;

		if (emt.identifier) {
			this.addElement(emt.identifier);
			emt.fqName = `${(emt.fqName ?? '')}.${emt.identifier.text}`;
		}
	}

	// addName(ident: IdentifierElement, emt: MethodElement | VariableStatementElement) {
	// 	const scope = this.documentScope.links.get(this.docUri)!;
	// 	const hoverText = emt.getHoverText();
	// 	if (scope.has(ident.text)) {
	// 		const scopeEls = scope.get(ident.text)!;
	// 		scopeEls[0] = emt;
	// 		scopeEls.filter((x): x is SyntaxElement => !!(x))
	// 			.forEach((x) => x.hoverText = hoverText);
	// 		return;
	// 	}
	// 	scope.set(ident.text, [emt]);
	// 	emt.hoverText = hoverText;
	// }

	addScopeDeclaration(emt: MethodElement | VariableDeclarationElement) {
		// Add a declared scope.
		// this.addElement(emt);
		const elId = emt.identifier!.text;
		const link = this.getNameLink(elId, emt.parent?.fqName ?? '', emt.hasPrivateModifier);
		link.declarations.push(emt);

		// Check the undeclared links and merge if found.
		const undeclaredScope = this.documentScope.getScope(`undeclared|${this.docUri}`);
		const undeclaredLink = undeclaredScope.get(elId);
		if (undeclaredLink) {
			link.merge(undeclaredLink);
			undeclaredScope.delete(elId);
		}
	}

	addScopeReference(emt: VariableAssignElement) {
		// this.addElement(emt);
		const link = this.getNameLink(emt.identifier!.text, emt.parent?.fqName ?? '', false, true);
		link.references.push(emt);
	}

	private getNameLink(identifier: string, fqName: string, isPrivate = false, searchScopes = false): NameLink {
		const targetScope = searchScopes ? this.searchScopes(identifier) : this.getScope(fqName, isPrivate);

		// Return an existing link.
		if (targetScope.has(identifier)) {
			return targetScope.get(identifier);
		}

		// Create a new link and return it.		
		const link = new NameLink();
		targetScope.set(identifier, link);
		return link;
	}

	private getScope(fqName: string, isPrivate: boolean): Map<string, NameLink> {
		const globalScope = this.documentScope.getScope('global');
		const localScope = this.documentScope.getScope(this.docUri);

		const isAtModuleLevel = (fqName ?? '') === this.docUri;
		return (isAtModuleLevel && !isPrivate) ? globalScope : localScope;
	}

	private searchScopes(identifier: string): Map<string, NameLink> {
		const scopeNames = [this.docUri, 'global'];
		for (let i = 0; i < scopeNames.length; i++) {
			const scope = this.documentScope.getScope(scopeNames[i]);
			if (scope.has(identifier)) {
				return scope;
			}
		}
		return this.documentScope.getScope(`undefined|${this.docUri}`);
	}


	finalise() {
		this.documentScope.processLinks(this.docUri, true);
		this.isBusy = false;
	}

	setModuleAttribute = (attr: ModuleAttribute) =>
		this.attrubutes.set(attr.key(), attr.value());

	setModuleIdentifier(ctx: LiteralContext, doc: TextDocument) {
		if (this.module)
			this.module.identifier = new IdentifierElement(ctx, doc);
	}

	getHover = (p: Position) =>
		this.getElementAtPosition(p)?.hover();

	getSemanticTokens(range?: Range): SemanticTokens | null {
		const r = range ?? this.module?.range;
		if (!r)
			return null;

		const semanticTokens = sortSemanticTokens(
			this.getElementsInRange(r)
				.filter((e) => !!e.semanticToken)
				.map((e) => e.semanticToken!));

		if (semanticTokens.length === 0)
			return null;

		let data: uinteger[] = [];
		let line = 0;
		let char = 0;
		semanticTokens.forEach((t) => {
			data = data.concat(t.toDeltaToken(line, char)!);
			line = t.line;
			char = t.startChar;
		});
		return { data: data };
	}

	private getElementAtPosition(p: Position): SyntaxElement | undefined {
		const r = Range.create(p, p);

		// Filter eligible parents by range.
		let parents = this.elements.filter((x) => rangeIsChildOfElement(r, x));
		if (parents.length === 0) { return; }
		if (parents.length === 1) { return parents[0]; }

		// Narrow parents down to the one(s) with the narrowest row scope.
		// In the incredibly unlikely case that we have two parents with the same number of rows
		// and they span more than one row, then it's all too hard. Just pick one.
		const minRows = Math.min(...parents.map((x) => x.range.end.line - x.range.start.line));
		parents = parents.filter((x) => x.range.end.line - x.range.start.line === minRows);
		if (parents.length === 1 || minRows > 0) {
			return parents[0];
		}

		// Narrow parents down to the one with the narrowest character scope.
		const minChars = Math.min(...parents.map((x) => x.range.end.character - x.range.start.character));
		parents = parents.filter((x) => x.range.end.character - x.range.start.character === minChars);
		return parents[0];
	}

	private getElementsInRange(r: Range): SyntaxElement[] {
		const results: SyntaxElement[] = [];
		if (r.start.line === r.end.line) {
			this.elements.forEach((x) => {
				if (x.range.start.character >= r.start.character && x.range.end.character <= r.end.character)
					results.push(x);
			});
		} else {
			this.elements.forEach((x) => {
				if (x.range.start.line >= r.start.line && x.range.end.line <= r.end.line)
					results.push(x);
			});
		}

		return results;
	}

	getSymbols = (uri: string): SymbolInformation[] =>
		this.elements
			.filter((x) => (!!x.identifier) && (x.identifier.text !== ''))
			.map((x) => x.symbolInformation(uri))
			.filter((x): x is SymbolInformation => !!x);

	getFoldingRanges = (): (FoldingRange)[] =>
		this.elements
			.filter((x) => !(x instanceof ModuleElement))
			.map((x) => x.foldingRange())
			.filter((x): x is FoldingRange => !!x);
}

class Scope {
	// { docUri: { identifier: [ declarationElement, elementLink... ] } }
	links: Map<string, Map<string, NameLink>> = new Map();

	constructor() {
		this.links.set('global', new Map());
	}

	getScope(key: string): Map<string, NameLink> {
		if (!this.links.has(key)) {
			this.links.set(key, new Map());
		}
		return this.links.get(key)!;
	}

	processLinks(key: string, optExplicit = false) {
		// TODO: check global for undeclareds
		this.getScope(key).forEach((x) => x.process(optExplicit));
	}
}

class NameLink {
	type: NameLinkType = NameLinkType.variable;

	// The original decalarations that affect this name.
	// 0: Variable or method not declared.
	// 1: Declared once.
	// 2: Multiple conflicting declarations.
	declarations: SyntaxElement[] = [];

	// The places this name is referenced.
	references: SyntaxElement[] = [];
	diagnostics: Diagnostic[] = [];

	private diagnosticRelatedInfo: DiagnosticRelatedInformation[] = [];

	merge(link: NameLink) {
		this.declarations.concat(link.declarations);
		this.references.concat(link.references);
		this.diagnostics.concat(link.diagnostics);

		if (link.declarations.length > 0) {
			this.type = link.type;
		}
	}

	process(optExplicit = false) {
		this.processDiagnosticRelatedInformation();
		this.validateDeclarationCount(optExplicit);
		this.validateMethodSignatures();
		this.assignSemanticTokens();
	}

	private processDiagnosticRelatedInformation() {
		this.diagnosticRelatedInfo = this.declarations
			.concat(this.references)
			.map((x) => DiagnosticRelatedInformation.create(
				x.location(),
				x.text
			));
	}

	private validateDeclarationCount(optExplicit: boolean) {
		// Base case.
		if (this.declarations.length === 1) {
			return;
		}

		const undecSeverity = (optExplicit) ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning;
		if (this.declarations.length === 0) {
			if (optExplicit || this.type !== NameLinkType.variable)
				this.references.forEach((x) =>
					this.diagnostics.push(Diagnostic.create(
						x.range,
						"No declaration for variable or method.",
						undecSeverity,
						404,
						'VbaPro',
						this.diagnosticRelatedInfo
					)));
			return;
		}
		this.declarations.forEach((x) =>
			this.diagnostics.push(Diagnostic.create(
				x.range,
				"Ambiguous variable declaration",
				DiagnosticSeverity.Error,
				500,
				'VbaPro',
				this.diagnosticRelatedInfo
			)));
	}

	private assignSemanticTokens() {
		if (this.declarations.length === 0) {
			return;
		}

		this.references.forEach(
			(x) => x.semanticToken = this.declarations[0]
										.semanticToken
										?.toNewRange(x.range));
	}

	private validateMethodSignatures() {
		// TODO: implement.
	}
}