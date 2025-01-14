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
import { BaseContextSyntaxElement, BaseIdentifyableSyntaxElement, HasSemanticTokenCapability } from '../project/elements/base';


abstract class BaseCapability {
	element: BaseContextSyntaxElement<ParserRuleContext>

	constructor(element: BaseContextSyntaxElement<ParserRuleContext>) {
		this.element = element;
	}
}


export class FoldingRangeCapability extends BaseCapability {
	foldingRangeKind?: FoldingRangeKind;
	
	get foldingRange(): FoldingRange {
		return new FoldingRange(this.element.context.range, this.foldingRangeKind);
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
	semanticToken: SemanticToken;

	constructor(element: BaseContextSyntaxElement<ParserRuleContext> & HasSemanticTokenCapability, tokenType: SemanticTokenTypes, tokenModifiers: SemanticTokenModifiers[], range?: Range, tokLength?: number) {
		super(element);

		const context = !!element.identifierCapability
			? element.identifierCapability.element.context
			: element.context;

		const startLine = range?.start.line ?? context.range.start.line;
		const startChar = range?.start.character ?? context.range.start.character;
		const textLength = tokLength ?? context.text.length;

		this.semanticToken = new SemanticToken(
			element,
			startLine,
			startChar,
			textLength,
			tokenType,
			tokenModifiers
		);
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
	nameContext?: ParserRuleContext | TerminalNode | null;
	range: Range;
	name: string;

	constructor(args: IdentifierArgs) {
		super(args.element);

		this.nameContext = (args.getNameContext ?? (() => args.element.context.rule))();

		if (!!this.nameContext) {
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