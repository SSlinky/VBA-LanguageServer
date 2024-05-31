import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { AttributeStmtContext, ModuleContext, ModuleHeaderContext, ModuleOptionContext } from '../../antlr/out/vbaParser';

import { BaseContextSyntaxElement, HasAttribute, HasDiagnosticCapability, HasSymbolInformation } from './base';
import { SymbolInformationFactory } from '../../capabilities/symbolInformation';
import { MissingOptionExplicitDiagnostic } from '../../capabilities/diagnostics';


export class ModuleElement extends BaseContextSyntaxElement implements HasSymbolInformation, HasAttribute, HasDiagnosticCapability {
	private _hasName = false;
	private _name: string;
	symbolKind: SymbolKind;
	diagnostics: Diagnostic[] = [];

	constructor(context: ModuleContext, document: TextDocument, symbolKind: SymbolKind) {
		super(context, document);
		this._name = "Unknown Module";
		this.symbolKind = symbolKind;
	}

	get name(): string {
		return this._name;
	}

	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, this.symbolKind
		);
	}

	evaluateDiagnostics(): void {
		const optionExplicitDiagnotic = this._getOptionExplicitDiagnostic();
		if (optionExplicitDiagnotic) {
			this.diagnostics.push(optionExplicitDiagnotic);
		}
	}

	private _getOptionExplicitDiagnostic(): Diagnostic | undefined {
		let optionExplicitFound = false;
		const context = this.context as ModuleContext;
		const declarations = context.moduleHeader().moduleDeclarations()?.moduleDeclarationsElement();

		if (declarations) {
			for (const declaration of declarations) {
				if ((declaration.moduleOption()?.text ?? '') === 'Option Explicit') {
					optionExplicitFound = true;
					break;
				}
			}
		}

		return optionExplicitFound ? undefined : new MissingOptionExplicitDiagnostic(
			(new ModuelHeaderElement(context.moduleHeader(), this.document)).range
		);
	}

	processAttribute(context: AttributeStmtContext): void {
		if (this._hasName) {
			return;
		}

		const text = context.text;
		if (text.startsWith("Attribute VB_Name = ")) {
			const unquote = (x: string): string =>
				x.replace(/^"+|"+$/g, '');

			this._name = unquote(text.split("= ")[1]);
			this._hasName = true;
		}
	}
}

class ModuelHeaderElement extends BaseContextSyntaxElement {
	constructor(context: ModuleHeaderContext, document: TextDocument) {
		super(context, document);
	}
}