// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { CompilerConditionalBlockContext, CompilerDefaultBlockContext, CompilerIfBlockContext, ConstDirectiveStatementContext } from '../../antlr/out/vbapreParser';

// Project
import { DiagnosticCapability, FoldingRangeCapability, IdentifierCapability } from '../../capabilities/capabilities';
import { BaseRuleSyntaxElement } from '../elements/base';
import { UnreachableCodeDiagnostic } from '../../capabilities/diagnostics';


type DocumentSettings = { environment: { os: string, version: string } };

export class CompilerDirectiveElement extends BaseRuleSyntaxElement<ConstDirectiveStatementContext> {
	identifierCapability: IdentifierCapability;

	constructor(ctx: ConstDirectiveStatementContext,
		doc: TextDocument,
		private readonly documentSettings: DocumentSettings,
		private readonly directiveConstants: Map<string, any>) {
		super(ctx, doc);

		const getNameCtx = () => ctx.constDirectiveName();
		this.identifierCapability = new IdentifierCapability(this, getNameCtx);
	}

	evaluate(): string {
		const vbaExpression = this.context.rule.directiveExpression().vbaExpression();
		try {
			const tsExpression = transpileVbaToTypescript(vbaExpression, this.documentSettings, this.directiveConstants);
			const getExpressionResult = Function('"use strict"; return (' + tsExpression + ')');
			return getExpressionResult().toString();
		} catch (e) {
			// FIXME Add a diagnostic for if this fails.
			return '0';
		}
	}
}


export class CompilerLogicalBlock extends BaseRuleSyntaxElement<CompilerIfBlockContext> {
	conditionalBlocks: CompilerConditionBlock[] = [];
	inactiveBlocks: CompilerConditionBlock[] = [];

	constructor(
		ctx: CompilerIfBlockContext,
		doc: TextDocument,
		documentSettings: DocumentSettings,
		directiveConstants: Map<string, any>) {
		super(ctx, doc);
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.foldingRangeCapability.openWord = '#If';
		this.foldingRangeCapability.closeWord = '#End If';

		// Create the block elements
		const blocks = [ctx.compilerConditionalBlock(), ctx.compilerDefaultBlock()].flat();
		blocks.map(x => {
			if (x) this.conditionalBlocks.push(
				new CompilerConditionBlock(x, doc, documentSettings, directiveConstants)
			);
		});

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


class CompilerConditionBlock extends BaseRuleSyntaxElement<CompilerConditionalBlockContext | CompilerDefaultBlockContext> {
	constructor(
		ctx: CompilerConditionalBlockContext | CompilerDefaultBlockContext,
		doc: TextDocument,
		private readonly documentSettings: DocumentSettings,
		private readonly directiveConstants: Map<string, any>) {
		super(ctx, doc);
	}

	get blockLines(): string[] {
		return this.context.rule.compilerBlockContent()?.getText().split('\n') ?? [];
	}

	get conditionResult(): boolean {
		// Default "Else" block is always true.
		const ctx = this.context.rule;
		if (((o: any): o is CompilerDefaultBlockContext => 'compilerElseStatement' in o)(ctx)) return true;

		const vbaExpression = ctx.compilerConditionalStatement().vbaExpression();
		const tsExpression = transpileVbaToTypescript(vbaExpression, this.documentSettings, this.directiveConstants);

		// Evaluate the expression and return the result.
		const result: boolean = Function('"use strict"; return (' + tsExpression + ')')();
		if (!(typeof result === "boolean")) {
			// TODO: Return false here instead of throwing
			// and return an error diagnostic for the expression.
			throw new Error("Expected boolean result.");
		}
		return result;
	}

	deactivate(): void {
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.diagnosticCapability.diagnostics.push(new UnreachableCodeDiagnostic(this.context.range));
	}
}

function transpileVbaToTypescript(exp: string, settings: DocumentSettings, directives: Map<string, any>): string {
	// Convert the environment constant to boolean.
	const envToBooleanText = (opt: string) => {
		const isOs = settings.environment.os.toLowerCase() == opt;
		const isVer = settings.environment.version.toLowerCase() == opt;
		return isOs || isVer ? 'true' : 'false';
	};

	// Set up text replacements map.
	const constants = ['vba6', 'vba7', 'mac', 'win16', 'win32', 'win64'];
	const replacements = new Map(constants.map(x => [x, envToBooleanText(x)]));
	replacements.set('or', '||');
	replacements.set('and', '&&');
	replacements.set('not ', '!');

	// Perform language text replacements.
	let result = exp;
	replacements.forEach((v, k) => {
		const regexp = RegExp(`${k}`, 'i');
		if (regexp.test(result)) {
			result = result.replace(regexp, v);
		}
	});

	// Perform user directives text replacements.
	directives.forEach((v, k) => {
		const regexp = RegExp(`${k}`, 'i');
		if (regexp.test(result)) {
			result = result.replace(regexp, v);
		}
	});

	return result;
}