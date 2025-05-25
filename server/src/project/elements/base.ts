// Core
import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ParserRuleContext, TerminalNode } from 'antlr4ng';

// Project
import {
	DiagnosticCapability,
	FoldingRangeCapability,
	IdentifierCapability,
	ScopeItemCapability,
	SemanticTokenCapability,
	SymbolInformationCapability
} from '../../capabilities/capabilities';


export abstract class BaseSyntaxElement {
	// Base Properties
	context?: Context<ParserRuleContext | TerminalNode>;
	identifierCapability?: IdentifierCapability;

	// Capabilities
	diagnosticCapability?: DiagnosticCapability;
	foldingRangeCapability?: FoldingRangeCapability;
	semanticTokenCapability?: SemanticTokenCapability;
	symbolInformationCapability?: SymbolInformationCapability;
	scopeItemCapability?: ScopeItemCapability;

	/**
	 *
	 */
	constructor() {
		let x: TerminalNode | ParserRuleContext;

	}
}


export abstract class BaseRuleSyntaxElement<T extends ParserRuleContext> extends BaseSyntaxElement {
	context!: Context<T>;

	constructor(ctx: T, doc: TextDocument) {
		super();
		this.context = new Context(ctx, doc);
	}

	/**
	 * Checks if this element is a child of another element.
	 * @returns True if the element is a child of the passed element.
	 */
	isChildOf(range: Range): boolean;
	isChildOf(element: BaseRuleSyntaxElement<T>): boolean;
	isChildOf(elementOrRange: BaseRuleSyntaxElement<T> | Range): boolean {
		const a = this.context?.range;
		const b = ((o: any): o is BaseRuleSyntaxElement<T> => 'context' in o)(elementOrRange)
			? elementOrRange.context?.range
			: elementOrRange;

		if (!a || !b) return false;

		const isPositionBefore = (x: Position, y: Position) => x.line < y.line
			|| (x.line === y.line && x.character <= y.character);

		return isPositionBefore(b.start, a.start)
			&& isPositionBefore(a.end, b.end);
	}

	/**
	 * Compare two syntax elements for equality.
	 * @returns True if the document, range, and text match.
	 */
	equals(element: BaseRuleSyntaxElement<T>): boolean {
		const a = this.context;
		const b = element.context;

		return !!a && !!b
			&& a.document.uri === b.document.uri
			&& a.range === b.range
			&& a.text === b.text;
	}
}


export abstract class BaseIdentifyableSyntaxElement<T extends ParserRuleContext> extends BaseRuleSyntaxElement<T> implements IsIdentifiable {
	abstract identifierCapability: IdentifierCapability;

	constructor(ctx: T, doc: TextDocument) {
		super(ctx, doc);
	}
}


// ---------------------------------------------------------
// Utilities
// ---------------------------------------------------------

export class Context<T extends ParserRuleContext | TerminalNode> {
	rule: T;
	document: TextDocument;
	range: Range;

	get text(): string {
		return this.rule.getText();
	}

	get startIndex() { return this.rule.startIndex(); }
	get stopIndex() { return this.rule.stopIndex(); }

	constructor(context: T, document: TextDocument) {
		this.rule = context;
		this.document = document;
		this.range = context.toRange(document);
	}
}


// ---------------------------------------------------------
// Interfaces
// ---------------------------------------------------------

export interface HasContext<T extends ParserRuleContext> {
	context: Context<T>;
}


export interface HasDiagnosticCapability extends HasContext<ParserRuleContext> {
	diagnosticCapability: DiagnosticCapability;
}


export interface IsIdentifiable {
	identifierCapability: IdentifierCapability
}


export interface HasSemanticTokenCapability {
	semanticTokenCapability: SemanticTokenCapability
}


export interface HasSymbolInformationCapability extends IsIdentifiable {
	symbolInformationCapability: SymbolInformationCapability
}

export interface HasScopeItemCapability {
	scopeItemCapability: ScopeItemCapability;
}


export interface HasFoldingRangeCapability {
	foldingRangeCapability: FoldingRangeCapability;
}


// ---------------------------------------------------------
// Compound Types
// ---------------------------------------------------------

export type DeclarableElement = BaseRuleSyntaxElement<ParserRuleContext> & IsIdentifiable & HasDiagnosticCapability;
