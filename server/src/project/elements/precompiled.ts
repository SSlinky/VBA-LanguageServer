// Core
import * as ts from "typescript";
import { Position, Range, SemanticTokenTypes } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ParserRuleContext } from 'antlr4ng';
import { CompilerConditionalBlockContext, CompilerDefaultBlockContext, CompilerIfBlockContext } from '../../antlr/out/vbapreParser';

// Project
import { SemanticTokenCapability } from '../../capabilities/capabilities';
import { BaseContextSyntaxElement, HasSemanticTokenCapability } from '../elements/base';


export class CompilerLogicalBlock extends BaseContextSyntaxElement<CompilerIfBlockContext> {
	conditionalBlocks: CompilerConditionBlock[] = [];
	inactiveBlocks: CompilerConditionBlock[] = [];

	constructor(ctx: CompilerIfBlockContext, doc: TextDocument, env: {environment: { os: string, version: string }}) {
		super(ctx, doc);

		// Create the block elements
		const blocks = [ctx.compilerConditionalBlock(), ctx.compilerDefaultBlock()].flat();
		blocks.map(x => { if(x) this.conditionalBlocks.push(new CompilerConditionBlock(x, doc, env)) });

		// Create the comment elements.
		let resolved = false;
		for (const block of this.conditionalBlocks) {
			if (!resolved && block.conditionResult) {
				resolved = true;
				continue;
			}
			this.inactiveBlocks.push(block);
		}
	}
}


class CompilerConditionBlock extends BaseContextSyntaxElement<CompilerConditionalBlockContext | CompilerDefaultBlockContext> {
	readonly documentSettings: {environment: { os: string, version: string }};

	constructor(ctx: CompilerConditionalBlockContext | CompilerDefaultBlockContext, doc: TextDocument, env: {environment: { os: string, version: string }}) {
		super(ctx, doc);
		this.documentSettings = env;
	}

	get blockLines(): string[] {
		return this.context.rule.compilerBlockContent()?.getText().split('\n') ?? [];
	}

	get linesToComments(): GenericCommentElement[] {
		const rowX = this.context.range.start.line;
		const rowY = this.context.range.end.line;

		// Iterate the rows -- test what happens when you get to the end of the document.
		// May require a try catch where the default offset is the character count of the document.
		const result: GenericCommentElement[] = [];
		for (let i = rowX; i < rowY; i++) {
			const posX = this.context.document.offsetAt({ line: i, character: 0 });
			const posY = this.context.document.offsetAt({ line: i + 1, character: 0 }) - 1;

			const lineRange = Range.create(
				this.context.document.positionAt(posX),
				this.context.document.positionAt(posY)
			);
			result.push(new GenericCommentElement(
				this.context.rule,
				this.context.document,
				lineRange)
			);
		}

		return result;
	}

	get conditionResult(): boolean {
		// Default "Else" block is always true.
		const ctx = this.context.rule;
		if(((o: any): o is CompilerDefaultBlockContext => 'compilerElseStatement' in o)(ctx)) return true;

		const vbaExpression = ctx.compilerConditionalStatement().vbaExpression();
		const tsExpression = this.transpileVbaToTypescript(vbaExpression);

		// Evaluate the expression and return the result.
		const result = eval(ts.transpile(tsExpression));
		if (!(typeof result === "boolean")) {
			// TODO: Return false here instead of throwing
			// and return an error diagnostic for the expression.
			throw new Error("Expected boolean result.");
		}
		return result;
	}

	/** Transpiles a VBA expression into Typescript. */
	private transpileVbaToTypescript(exp: string): string {
		// Convert the environment constant to boolean.
		const envToBooleanText = (opt: string) => {
			const isOs = this.documentSettings.environment.os.toLowerCase() == opt;
			const isVer = this.documentSettings.environment.version.toLowerCase() == opt;
			return isOs || isVer ? 'true' : 'false';
		}

		// Set up text replacements map.
		const constants = ['vba6', 'vba7', 'mac', 'win16', 'win32', 'win64']
		const replacements = new Map(constants.map(x => [x, envToBooleanText(x)]));
		replacements.set('or', '||');
		replacements.set('and', '&&');
		replacements.set('not ', '!');

		// Perform text replacements.
		let result = exp;
		replacements.forEach((v, k) => {
			const regexp = RegExp(`${k}`, 'i')
			if (regexp.test(result)) {
				result = result.replace(regexp, v);
			}
		});

		return result;
	}
}


export class GenericCommentElement extends BaseContextSyntaxElement<ParserRuleContext> implements HasSemanticTokenCapability {
	semanticTokenCapability: SemanticTokenCapability;

	constructor(ctx: ParserRuleContext, doc: TextDocument, range?: Range) {
		super(ctx, doc);
		const textLen = range ? doc.offsetAt(range.end) - doc.offsetAt(range.start) + 1 : undefined;
		this.semanticTokenCapability = new SemanticTokenCapability(this, SemanticTokenTypes.comment, [], range, textLen)
	}
}
