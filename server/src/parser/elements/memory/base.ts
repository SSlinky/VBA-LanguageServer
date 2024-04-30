import { SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver';
import { BaseElement } from '../base';
import { SemanticToken } from '../../../capabilities/vbaSemanticTokens';
import { VariableDeclarationElement } from './variables';
import { ArgListContext, ConstStmtContext, VariableStmtContext } from '../../../antlr/out/vbaParser';
import { TextDocument } from 'vscode-languageserver-textdocument';

export enum Visibility {
	"Private",
	"Friend",
	"Public",
	"Global"
}

export enum BaseTypes {
	'string',
	'oct',
	'hex',
	'short',
	'double',
	'integer',
	'date',
	'boolean',
	'variant'
}

export interface IDeclaration {
	asType(): any;
}

export interface IReference {
	declaration(): IDeclaration
}

export abstract class BaseDeclarations extends BaseElement {
	variableList: VariableDeclarationElement[] = [];

	constructor(ctx: VariableStmtContext | ConstStmtContext | ArgListContext, doc: TextDocument) {
		super(ctx, doc);
	}

	/**
	 * Creates a semantic token for this declaration.
	 * @param tokenModifiers the token modifiers as a list.
	 */
	protected createSemanticToken(tokenModifiers: SemanticTokenModifiers[]) {
		const name = this.identifier!;
		this.semanticToken = new SemanticToken(
			name.range.start.line,
			name.range.start.character,
			name.text.length,
			SemanticTokenTypes.variable,
			tokenModifiers
		);
	}
}

// Need to figure out how to handle call chains like MyClass.MyProp.Value
export abstract class BaseDeclaration extends BaseElement {
	semanticToken?: SemanticToken | undefined;
	visibility = Visibility.Private;
	isArray = false;
	hasScope = false;
	references: BaseReference[] = [];

	get isPublic(): boolean {
		return [Visibility.Global, Visibility.Public].includes(this.visibility);
	}

	get identifierText(): string {
		return this.identifier?.context.text ?? "Undefined";
	}
}

export abstract class BaseReference extends BaseElement {
	declarationElement: BaseDeclaration | undefined;

	get identifierText(): string {
		return this.identifier?.context.text ?? "Undefined";
	}
}