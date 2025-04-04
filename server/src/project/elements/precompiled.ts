// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { CompilerConditionalBlockContext, CompilerDefaultBlockContext, CompilerIfBlockContext } from '../../antlr/out/vbapreParser';

// Project
import { DiagnosticCapability, FoldingRangeCapability } from '../../capabilities/capabilities';
import { BaseContextSyntaxElement } from '../elements/base';
import { UnreachableCodeDiagnostic } from '../../capabilities/diagnostics';


export class CompilerLogicalBlock extends BaseContextSyntaxElement<CompilerIfBlockContext> {
	conditionalBlocks: CompilerConditionBlock[] = [];
	inactiveBlocks: CompilerConditionBlock[] = [];

	constructor(ctx: CompilerIfBlockContext, doc: TextDocument, env: {environment: { os: string, version: string }}) {
		super(ctx, doc);
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.foldingRangeCapability.openWord = '#If'
		this.foldingRangeCapability.closeWord = '#End If'

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
			block.deactivate();
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

	get conditionResult(): boolean {
		// Default "Else" block is always true.
		const ctx = this.context.rule;
		if(((o: any): o is CompilerDefaultBlockContext => 'compilerElseStatement' in o)(ctx)) return true;

		const vbaExpression = ctx.compilerConditionalStatement().vbaExpression();
		const tsExpression = this.transpileVbaToTypescript(vbaExpression);

		// Evaluate the expression and return the result.
		const result = eval(tsExpression);
		if (!(typeof result === "boolean")) {
			// TODO: Return false here instead of throwing
			// and return an error diagnostic for the expression.
			throw new Error("Expected boolean result.");
		}
		return result;
	}

	deactivate(): void {
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.diagnosticCapability.diagnostics.push(new UnreachableCodeDiagnostic(this.context.range))
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
