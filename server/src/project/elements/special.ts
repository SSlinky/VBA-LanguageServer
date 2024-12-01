import * as ts from "typescript";
import { ParserRuleContext } from 'antlr4ng';
import { FoldingRangeKind } from '../../capabilities/folding';
import { BaseContextSyntaxElement, DeclarationElement, FoldingRangeElement, HasSemanticToken, IdentifiableSyntaxElement, NamedSyntaxElement } from './base';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { IdentifierElement, PropertyDeclarationElement } from './memory';
import { Diagnostic, integer, Range, SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver';
import { CompilerConditionalBlockContext, CompilerConditionalStatementContext, CompilerDefaultBlockContext, CompilerIfBlockContext } from '../../antlr/out/vbapreParser';


// TODO: Reorganise this stuff as properties of more generic classes.
// Whether the element is foldable or not is complicating inheritence.
export class FoldableElement extends BaseContextSyntaxElement implements FoldingRangeElement {
	range!: Range;
	foldingRangeKind?: FoldingRangeKind;
	
	constructor(ctx: ParserRuleContext, doc: TextDocument, foldingRangeKind?: FoldingRangeKind) {
		super(ctx, doc);
		this.foldingRangeKind = foldingRangeKind;
	}
}

export abstract class ScopeElement extends FoldableElement implements DeclarationElement {
	isPublic = false;
	diagnostics: Diagnostic[] = [];

	isPropertyElement(): this is PropertyDeclarationElement {
		return 'getDeclarations' in this;
	}

	constructor(ctx: ParserRuleContext, doc: TextDocument, foldingRangeKind?: FoldingRangeKind) {
		super(ctx, doc, foldingRangeKind);
	}

	abstract evaluateDiagnostics(): Diagnostic[];
	abstract get name(): string;
}

export abstract class IdentifiableScopeElement extends BaseContextSyntaxElement implements DeclarationElement, IdentifiableSyntaxElement {
	isPublic = false;
	diagnostics: Diagnostic[] = [];
	abstract identifier: IdentifierElement;

	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		super(ctx, doc);
	}

	isPropertyElement(): this is PropertyDeclarationElement {
		return 'getDeclarations' in this;
	}
	abstract evaluateDiagnostics(): Diagnostic[];
	get name(): string {
		return this.identifier.text;
	}
}

export class CompilerIfBlockElement extends BaseContextSyntaxElement {
	readonly inactiveChildren: InactiveConstantBlockElement[] = [];
	readonly options: {environment: { os: string, version: string }}
	readonly blocks: CompilerConditionalBlockContext[] = [];
	readonly defaultBlock: CompilerDefaultBlockContext | null;

	constructor(ctx: CompilerIfBlockContext, doc: TextDocument, opts: {environment: { os: string, version: string }}) {
		super(ctx, doc);
		this.options = opts;
		this.blocks = ctx.compilerConditionalBlock();
		this.defaultBlock = ctx.compilerDefaultBlock();

		// Add the inactive condition blocks.
		let hasTrueBlock = false;
		for (let i = 0; i < this.blocks.length; i++) {
			const element = this.blocks[i];
			const elementIsTrue = !hasTrueBlock && this.getConditionResult(element.compilerConditionalStatement());

			if (elementIsTrue) {
				hasTrueBlock = true;
				continue;
			}

			this.inactiveChildren.push(new InactiveConstantBlockElement(element, doc));
		}
		// Add the default one if we have one and a condition evaluated true.
		if (hasTrueBlock && !!this.defaultBlock) {
			this.inactiveChildren.push(new InactiveConstantBlockElement(this.defaultBlock, doc));
		}
	}

	getConditionResult(ctx: CompilerConditionalStatementContext): boolean {
		const statement = ctx.compilerIfStatement() ?? ctx.compilerElseIfStatement()!;
		const expression = statement.booleanExpression();

		let expressionText = expression.getText();
		const boolText = (opt: string) => {
			const isOs = this.options.environment.os == opt;
			const isVer = this.options.environment.version == opt;
			return isOs || isVer ? 'true' : 'false';
		}

		// Configure from options.
		const constants = ['VBA6', 'Vba7', 'MAC', 'WIN16', 'WIN32', 'Win64']
		const replacements = new Map(constants.map(x => [x, boolText(x)]));
		replacements.set('Or', '||');
		replacements.set('And', '&&');
		replacements.set('Not ', '!');

		// Perform replacements.
		replacements.forEach((v, k) => {
			const regexp = RegExp(`${k}`, 'i')
			if (regexp.test(expressionText)) {
				expressionText = expressionText.replace(regexp, v);
			}
		});

		// Evaluate the expression and return the result.
		const result = eval(ts.transpile(expressionText));
		if (!(typeof result === "boolean")) {
			throw new Error("Expected boolean result.");
		}
		return result;
	}
}

class InactiveConstantBlockElement extends BaseContextSyntaxElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];
	lines: InactiveLineElement[];

	constructor(ctx: CompilerConditionalBlockContext | CompilerDefaultBlockContext, doc: TextDocument) {
		super(ctx, doc)
		this.tokenType = SemanticTokenTypes.comment;
		this.lines = this._createLines();
	}

	private _createLines(): InactiveLineElement[] {
		const inactiveLines = this.text.split('\r\n');
		let stopIndex = (this.context?.start?.start ?? 0);

		// Generate the individual ranges.
		const ranges: Range[] = [];
		for (const line of inactiveLines) {
			// Ignore blank lines.
			if (line.length === 0) {
				continue;
			}

			// Create a range from the segment.
			const startIndex = stopIndex;
			stopIndex += line.length + 2;
			ranges.push(Range.create(
				this.document.positionAt(startIndex),
				this.document.positionAt(stopIndex)
			));
		}

		// Return InactiveLineElement objects.
		return ranges.map(range => new InactiveLineElement(this.context, this.document, range))
	}
}

export class InactiveLineElement extends BaseContextSyntaxElement implements HasSemanticToken {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[] = [];

	get text(): string {
		return this.document.getText(this.range);
	}

	constructor(ctx: ParserRuleContext, doc: TextDocument, range?: Range) {
		super(ctx, doc)
		this.tokenType = SemanticTokenTypes.comment;
		if (range) {
			this.range = range;
		}
	}
}