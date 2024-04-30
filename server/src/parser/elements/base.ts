import { ParserRuleContext } from 'antlr4ts';
import { Diagnostic, FoldingRange, Hover, Location, MarkupContent, MarkupKind, Range, SemanticTokenModifiers, SemanticTokenTypes, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AmbiguousIdentifierContext, LiteralContext } from '../../antlr/out/vbaParser';
import { SemanticToken } from '../../capabilities/vbaSemanticTokens';
import { getCtxRange } from '../../utils/helpers';


export interface SyntaxElement {
	uri: string;
	text: string;
	range: Range;
	identifier?: IdentifierElement;
	context: ParserRuleContext;
	symbolKind: SymbolKind;
	semanticToken?: SemanticToken;
	diagnostics: Diagnostic[];
	name: string;
	
	readonly namespace: string;

	parent?: SyntaxElement;
	children: SyntaxElement[];

	getAncestorCount(): number;
	hover(): Hover | undefined;
	isChildOf(element: SyntaxElement): boolean;
	symbolInformation(uri: string): SymbolInformation | undefined;
	foldingRange(): FoldingRange | undefined;
	location(): Location;
	addDiagnostics(diagnostics: Diagnostic[]): void;
}

export interface Identifiable {
	ambiguousIdentifier(): AmbiguousIdentifierContext;
	ambiguousIdentifier(i: number): AmbiguousIdentifierContext;
}

export abstract class BaseElement implements SyntaxElement {
	abstract name: string;
	uri: string;
	text: string;
	range: Range;
	identifier?: IdentifierElement;
	context: ParserRuleContext;
	symbolKind: SymbolKind;
	semanticToken?: SemanticToken;
	diagnostics: Diagnostic[] = [];

	parent?: SyntaxElement;

	children: SyntaxElement[] = [];
	private _countAncestors = 0;

	protected _hoverContent: MarkupContent | undefined;

	get namespace(): string {
		return `${this.parent?.namespace}.${this.identifier?.text}`;
	}

	get hoverContent(): MarkupContent {
		if(this._hoverContent === undefined) {
			this.hoverContent = {
				kind: MarkupKind.PlainText,
				value: ''
			};
		}
		return this._hoverContent!;
	}

	set hoverContent(value: MarkupContent) {
		this._hoverContent = value;
	}

	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		this.uri = doc.uri;
		this.context = ctx;
		this.range = getCtxRange(ctx, doc);
		this.text = ctx.text;
		this.setIdentifierFromDoc(doc);
		this.symbolKind = SymbolKind.Null;
	}

	hover = () => this.parent?.hover();

	location = (): Location => Location.create(this.uri, this.range);

	isChildOf(element: SyntaxElement): boolean {
		const tr = this.range;
		const pr = element.range;

		const psl = pr.start.line;
		const psc = pr.start.character;
		const tsl = tr.start.line;
		const tsc = tr.start.character;

		const pel = pr.end.line;
		const pec = pr.end.character;
		const tel = tr.end.line;
		const tec = tr.end.character;

		const prStartEarlier = (psl < tsl) || (psl === tsl && psc <= tsc);
		const prEndsAfter = (pel > tel) || (pel === tel && pec >= tec);

		return prStartEarlier && prEndsAfter;
	}

	symbolInformation = (uri: string): SymbolInformation | undefined =>
		SymbolInformation.create(
			this.identifier!.text,
			this.symbolKind,
			this.range,
			uri,
			this.parent?.identifier?.text ?? '');

	foldingRange = (): FoldingRange | undefined =>
		FoldingRange.create(
			this.range.start.line,
			this.range.end.line,
			this.range.start.character,
			this.range.end.character
		);

	addDiagnostics(diagnostics: Diagnostic[]) {
		this.diagnostics = this.diagnostics.concat(diagnostics);
	}

	getAncestorCount(n = 0): number {
		if (this._countAncestors === 0) {
			const pnt = this.getParent();
			if (pnt) {
				this._countAncestors = pnt.getAncestorCount(n + 1);
				return this._countAncestors;
			}
		}
		return this._countAncestors + n;
	}

	toString = () => `${"-".repeat(this.getAncestorCount())} ${this.constructor.name}: ${this.context.text}`;

	protected setIdentifierFromDoc(doc: TextDocument): void {
		if (this.isIdentifiable(this.context)) {
			const identCtx = this.context.ambiguousIdentifier(0);
			if (identCtx) {
				this.identifier = new IdentifierElement(identCtx, doc);
			}
		}
	}

	protected isIdentifiable = (o: any): o is Identifiable =>
		'ambiguousIdentifier' in o;

	private getParent(): BaseElement | undefined {
		if (this.parent) {
			if (this.parent instanceof BaseElement) {
				return this.parent;
			}
		}
	}
}

export class IdentifierElement extends BaseElement {
	name = "IdentifierElement";
	constructor(ctx: AmbiguousIdentifierContext | LiteralContext, doc: TextDocument, name?: string | undefined) {
		super(ctx, doc);
		if(name) this.name = name;
	}

	createSemanticToken(tokType: SemanticTokenTypes, tokMods?: SemanticTokenModifiers[]) {
		if (!(this.context instanceof AmbiguousIdentifierContext) && !(this.context instanceof LiteralContext))
			return;

		this.semanticToken = new SemanticToken(
			this.range.start.line,
			this.range.start.character,
			this.text.length,
			tokType,
			tokMods ?? []
		);

		
	}
}

export class FoldableElement extends BaseElement {
	name = "FoldableElement";
}

export class UnknownElement extends BaseElement {
	name = "UnknownElement";
}
