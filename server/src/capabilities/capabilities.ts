// Core
import {
	Diagnostic,
	Range,
	SemanticTokenModifiers,
	SemanticTokenTypes,
	SymbolInformation,
	SymbolKind
} from 'vscode-languageserver';

// Antlr
import { ParserRuleContext, TerminalNode } from 'antlr4ng';

// Project
import { SemanticToken } from '../capabilities/semanticTokens';
import { FoldingRange, FoldingRangeKind } from '../capabilities/folding';
import { BaseContextSyntaxElement, BaseIdentifyableSyntaxElement, Context, HasSemanticTokenCapability } from '../project/elements/base';


abstract class BaseCapability {
	element: BaseContextSyntaxElement<ParserRuleContext>

	constructor(element: BaseContextSyntaxElement<ParserRuleContext>) {
		this.element = element;
	}
}


export class FoldingRangeCapability extends BaseCapability {
	foldingRangeKind?: FoldingRangeKind;
	openWord?: string;
	closeWord?: string;
	
	get foldingRange(): FoldingRange {
		const trailingLineCount = this.element.context.rule.countTrailingLineEndings();
		const start = this.element.context.range.start;
		const end = {
			line: this.element.context.range.end.line - trailingLineCount,
			character: this.element.context.range.end.character
		}
		const range = Range.create(start, end);
		return new FoldingRange(range, this.foldingRangeKind, this.openWord, this.closeWord);
	}

	constructor(element: BaseContextSyntaxElement<ParserRuleContext>, foldingRangeKind?: FoldingRangeKind) {
		super(element);
		this.foldingRangeKind = foldingRangeKind;
	}
}


export class DiagnosticCapability extends BaseCapability {
	diagnostics: Diagnostic[] = [];
	evaluate: (...args: any[]) => Diagnostic[]

	constructor(element: BaseContextSyntaxElement<ParserRuleContext>, evaluate?: (...args: any[]) => Diagnostic[]) {
		super(element);
		this.evaluate = evaluate ?? (() => this.diagnostics);
	}
}


export class SemanticTokenCapability extends BaseCapability {
	private tokenType: SemanticTokenTypes;
	private tokenModifiers: SemanticTokenModifiers[];
	private overrideRange?: Range;
	private overrideLength?: number;

	get semanticToken(): SemanticToken {
		const element = this.element as BaseContextSyntaxElement<ParserRuleContext> & HasSemanticTokenCapability;
		const context = !!element.identifierCapability
			? new Context(element.identifierCapability.nameContext, element.context.document)
			: element.context;

		const range = this.overrideRange ?? context.range;
		const startLine = range.start.line;
		const startChar = range.start.character;
		const textLength = this.overrideLength ?? context.text.length;

		return new SemanticToken(
			element,
			startLine,
			startChar,
			textLength,
			this.tokenType,
			this.tokenModifiers
		);
	}

	constructor(element: BaseContextSyntaxElement<ParserRuleContext> & HasSemanticTokenCapability, tokenType: SemanticTokenTypes, tokenModifiers: SemanticTokenModifiers[], overrideRange?: Range, overrideLength?: number) {
		super(element);
		this.tokenType = tokenType; 
		this.tokenModifiers = tokenModifiers; 
		this.overrideRange = overrideRange; 
		this.overrideLength = overrideLength;
	}
}


export class SymbolInformationCapability extends BaseCapability {
	private symbolKind: SymbolKind

	get SymbolInformation(): SymbolInformation {
		const element = this.element as BaseIdentifyableSyntaxElement<ParserRuleContext>;
		return SymbolInformation.create(
			element.identifierCapability.name,
			this.symbolKind,
			element.context.range,
			element.context.document.uri
		)
	}

	constructor(element: BaseIdentifyableSyntaxElement<ParserRuleContext>, symbolKind: SymbolKind) {
		super(element);
		this.symbolKind = symbolKind;
	}
}

interface IdentifierArgs {
	element: BaseContextSyntaxElement<ParserRuleContext>,
	getNameContext?: () => ParserRuleContext | TerminalNode | null | undefined,
	formatName?: (name: string) => string,
	defaultName?: string;
	defaultRange?: () => Range;
}


export class IdentifierCapability extends BaseCapability {
	nameContext: ParserRuleContext | TerminalNode;
	range: Range;
	name: string;
	isDefaultMode: boolean;

	constructor(args: IdentifierArgs) {
		super(args.element);

		this.nameContext = ((args.getNameContext ?? (() => args.element.context.rule))() ?? args.element.context.rule);
		this.isDefaultMode = !(!!args.getNameContext && !!args.getNameContext());

		if (!this.isDefaultMode) {
			// Use the context to set the values.
			this.name = (args.formatName ?? ((name: string) => name))(this.nameContext.getText());
			this.range = this.nameContext.toRange(args.element.context.document);
		} else {
			// Use the defaults to set the values.
			if (!args.defaultRange) throw new Error("Default range not optional where name context not found.");
			this.name = (args.defaultName ?? "Unknown Element");
			this.range = !!args.defaultRange ? args.defaultRange() : args.element.context.range;
		}
	}
}