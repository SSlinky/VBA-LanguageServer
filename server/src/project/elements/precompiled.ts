// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { CompilerConditionalBlockContext, CompilerDefaultBlockContext, CompilerIfBlockContext, ConstDirectiveStatementContext, DirectiveExpressionContext, DirectiveLiteralExpressionContext, OrderOfOps1Context, OrderOfOps2Context, OrderOfOps3Context, OrderOfOps4Context, OrderOfOps5Context, OrderOfOps6Context } from '../../antlr/out/vbapreParser';

// Project
import { DiagnosticCapability, FoldingRangeCapability, IdentifierCapability } from '../../capabilities/capabilities';
import { BaseRuleSyntaxElement } from '../elements/base';
import { CannotEvaluateExpressionDiagnostic, UnreachableCodeDiagnostic } from '../../capabilities/diagnostics';
import { Services } from '../../injection/services';


type DocumentSettings = { environment: { os: string, version: string } };

export class CompilerDirectiveElement extends BaseRuleSyntaxElement<ConstDirectiveStatementContext> {
	identifierCapability: IdentifierCapability;
	diagnosticCapability: DiagnosticCapability;

	constructor(
		ctx: ConstDirectiveStatementContext,
		doc: TextDocument,
		private readonly documentSettings: DocumentSettings,
		private readonly directiveConstants: Map<string, any>) {
		super(ctx, doc);

		const getNameCtx = () => ctx.constDirectiveName();
		this.identifierCapability = new IdentifierCapability(this, getNameCtx);
		this.diagnosticCapability = new DiagnosticCapability(this);
	}

	evaluate(): string | number | boolean | Date | null {
		const expr = new Expression(this.context.rule.directiveExpression(), this.context.document, this.documentSettings, this.directiveConstants);
		const result = expr.evaluate();

		Services.logger.log(`Evaluated ${expr.context.text} to ${result}`);

		if (result === undefined) {
			const diagnostic = new CannotEvaluateExpressionDiagnostic(expr.context.range, expr.context.text);
			this.diagnosticCapability.diagnostics.push(diagnostic);
			return null;
		}

		return result;

		// const vbaExpression = this.context.rule.directiveExpression().vbaExpression();
		// try {
		// 	const tsExpression = transpileVbaToTypescript(vbaExpression, this.documentSettings, this.directiveConstants);
		// 	const getExpressionResult = Function('"use strict"; return (' + tsExpression + ')');
		// 	return getExpressionResult().toString();
		// } catch (e) {
		// 	const expressionRange = this.context.rule.directiveExpression().toRange(this.context.document);
		// 	const diagnostic = new CannotEvaluateExpressionDiagnostic(expressionRange, vbaExpression);
		// 	this.diagnosticCapability.diagnostics.push(diagnostic);
		// 	return '0';
		// }
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
			block.deactivateContent();
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
		const result = Function('"use strict"; return (' + tsExpression + ')')();
		if (!(typeof result === "boolean")) {
			// TODO: Return false here instead of throwing
			// and return an error diagnostic for the expression.
			throw new Error(`Expected boolean result from ${vbaExpression} => ${tsExpression}.`);
		}
		return result;
	}

	deactivateContent(): void {
		const contentRange = this.context.rule.compilerBlockContent()?.toRange(this.context.document);
		if (contentRange) {
			this.diagnosticCapability = new DiagnosticCapability(this);
			this.diagnosticCapability.diagnostics.push(new UnreachableCodeDiagnostic(contentRange));
		}
	}
}

type OperatorContext = OrderOfOps1Context
	| OrderOfOps2Context
	| OrderOfOps3Context
	| OrderOfOps4Context
	| OrderOfOps5Context
	| OrderOfOps6Context;

class Expression extends BaseRuleSyntaxElement<DirectiveExpressionContext> {
	private leftExpr?: Expression;
	private rightExpr?: Expression;
	private operatorCtx?: OperatorContext;
	private isNot = false;

	constructor(
		ctx: DirectiveExpressionContext,
		doc: TextDocument,
		private readonly documentSettings: DocumentSettings,
		private readonly directiveConstants: Map<string, any>
	) {
		super(ctx, doc);

		// Set the left, right, and operator if we have them.
		const expressions = ctx.directiveExpression().map(x =>
			new Expression(x, doc, documentSettings, directiveConstants)
		);
		this.leftExpr = expressions[0];
		this.rightExpr = expressions[1];
		this.operatorCtx = ctx.orderOfOps1()
			?? ctx.orderOfOps2()
			?? ctx.orderOfOps3()
			?? ctx.orderOfOps4()
			?? ctx.orderOfOps5()
			?? ctx.orderOfOps6()
			?? undefined;

		// If we're a 'not' expression, set the flag and the left side only.
		const notCtx = ctx.notDirectiveExpression();
		if (notCtx) {
			this.isNot = true;
			const leftExprCtx = notCtx.directiveExpression();
			this.leftExpr = new Expression(leftExprCtx, doc, documentSettings, directiveConstants);
		}

		// Set the expression from the parenthesized expression if we have one.
		const parenthExpr = ctx.directiveParenthesizedExpression()?.directiveExpression();
		if (parenthExpr) {
			this.leftExpr = new Expression(parenthExpr, doc, documentSettings, directiveConstants);
		}
	}

	evaluate(): string | number | boolean | Date | null | undefined {
		// Evaluate a not expression.
		if (this.isNot && this.leftExpr) {
			return !this.leftExpr.evaluate();
		}

		// Evaluate as left-operator-right.
		if (this.leftExpr && this.rightExpr && this.operatorCtx) {
			const result = this.performCalculation(this.leftExpr, this.rightExpr, this.operatorCtx);
			return result;
		}

		// Evaluate a literal if we have one.
		const ctx = this.context.rule;
		const literal = ctx.directiveLiteralExpression();
		if (literal) {
			return this.evaluateValue(literal);
		}

		// Evaluate an environment constant if we have one.
		const envConstant = ctx.unreservedWord()
			?.compilerConstant()
			?.getText();
		if (envConstant) {
			return envConstant.ciEquals(this.documentSettings.environment.os)
				|| envConstant.ciEquals(this.documentSettings.environment.version);
		}

		// Evaluate a user constant if we have one.
		const userConstant = ctx.unreservedWord()?.getText();
		if (userConstant) {
			return this.directiveConstants.get(userConstant);
		}

		// Otherwise try to return the left expression.
		return this.leftExpr?.evaluate();
	}

	private evaluateValue(literal: DirectiveLiteralExpressionContext) {
		// Handle a boolean literal.
		const boolCtx = literal.literalIdentifier()?.booleanLiteralIdentifier();
		if (boolCtx) return !!boolCtx.TRUE();

		// Handle a string literal.
		const stringCtx = literal.LITSTRING();
		if (stringCtx) return stringCtx.getText();

		// Handle a whole number literal.
		const intCtx = literal.LITINTEGER();
		if (intCtx) return Number.parseInt(intCtx.getText());

		// Handle a floating point number literal.
		const floatCtx = literal.LITFLOAT();
		if (floatCtx) return Number.parseFloat(floatCtx.getText());

		// Handle a date literal.
		const dateCtx = literal.LITDATE();
		if (dateCtx) {
			const dateStr = RegExp('#([^#]*)#').exec(dateCtx.getText())?.[1];
			return dateStr ? new Date(dateStr) : undefined;
		}

		// If we get here, we are Null, Empty, or Nothing.
		return null;
	}

	private performCalculation(left: Expression, right: Expression, operation: OperatorContext): number | boolean | string | Date | null | undefined {
		const lResult = left.evaluate();
		const rResult = right.evaluate();

		// Pass on undefined if one or both of our values evaluated to undefined.
		if (lResult === undefined || rResult === undefined) return undefined;

		// TODO: Test scenarios to account for differences in the way each language coerces values.
		const ops = new Map<string, (x: any, y: any) => number | boolean | string | Date | null>();
		ops.set('+', (x, y) => x + y);
		ops.set('-', (x, y) => x - y);
		ops.set('*', (x, y) => x * y);
		ops.set('/', (x, y) => x / y);
		ops.set('\\', (x, y) => Math.floor(x / y));
		ops.set('=', (x, y) => x == y);
		ops.set('MOD', (x, y) => x % y);
		ops.set('OR', (x, y) => x || y);
		ops.set('XOR', (x, y) => x ^ y);
		ops.set('AND', (x, y) => x && y);
		ops.set('<', (x, y) => x < y);
		ops.set('>', (x, y) => x > y);
		ops.set('>=', (x, y) => x >= y);
		ops.set('<=', (x, y) => x <= y);
		ops.set('<>', (x, y) => x != y);
		ops.set('&', (x, y) => {
			const concat = `${x}${y}`;
			if (concat.length > 0 && /^\s*-?(\d+|\d*\.\d+)\s*$/.test(concat)) {
				return parseFloat(concat);
			} else {
				return concat;
			}
		});

		// Like is not a valid operator in constant expressions,
		// however, the code may eventually be useful elsewhere.
		// ops.set('like', (x, y) => {
		// 	const a = x.toString();
		// 	const b = y.toString();

		// 	if (a === b) {
		// 		return true;
		// 	}

		// 	const pattern = b.replace(/[#?*]/g, (tag: string): string =>
		// 		(new Map<string, string>([
		// 			['#', '\\d'],
		// 			['?', '.'],
		// 			['*', '.*'],
		// 		])).get(tag) ?? tag);
			
		// 	return RegExp(pattern).test(a);
		// });

		ops.set('EQV', (x: any, y: any) => {
			const xnor = ~(x ^ y);
			const bits = (x > y ? x : y).toString(2).length;
			const mask = (1 << bits) - 1;
			return xnor & mask;
		});

		// There's no way this works the same as in VBA.
		// Probably need to infer the bits from the variable type.
		ops.set('IMP', (x: any, y: any) => {
			const imp = ~x | y;
			const bits = (x > y ? x : y).toString(2).length;
			const mask = (1 << bits) - 1;
			return imp & mask;
		});

		// Perform the operation if it's a known type.
		const op = ops.get(operation.getText().toUpperCase());
		if (op) return op(lResult, rResult);
	}
}


function transpileVbaToTypescript(exp: string, settings: DocumentSettings, directives: Map<string, any>): string {
	// Convert the environment constant to boolean.
	const envToBooleanText = (opt: string): string => (
		opt.ciEquals(settings.environment.os)
		|| opt.ciEquals(settings.environment.version)
	).toString();

	// Set up text replacements map.
	const constants = ['vba6', 'vba7', 'mac', 'win16', 'win32', 'win64'];
	const replacements = new Map(constants.map(x => [x, envToBooleanText(x)]));
	replacements.set('<>', '!=');
	replacements.set('or', '||');
	replacements.set('xor', '^');
	replacements.set('mod', '%');
	replacements.set('not', '!');
	replacements.set('and', '&&');
	replacements.set('eqv', '');

	const getPattern = (x: string) => `(.*)\\b${x}\\b(.*)`;

	// Perform language text replacements.
	let result = exp;
	replacements.forEach((v, k) => {
		const regexp = RegExp(getPattern(k), 'i');
		if (regexp.test(result)) {
			result = result.replace(regexp, v);
		}
	});

	// Perform user directives text replacements.
	directives.forEach((v, k) => {
		const regexp = RegExp(getPattern(k), 'i');
		if (regexp.test(result)) {
			Services.logger.log(`Replacing ${k} with ${v}`);
			result = result.replace(regexp, v);
		}
	});

	return result;
}