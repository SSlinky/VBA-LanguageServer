import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { AttributeStmtContext, ModuleContext } from '../../antlr/out/vbaParser';

import { BaseContextSyntaxElement, HasAttribute, HasSymbolInformation } from './base';
import { SymbolInformationFactory } from '../../capabilities/symbolInformation';


export class ModuleElement extends BaseContextSyntaxElement implements HasSymbolInformation, HasAttribute {
	private _hasName = false;
	private _name: string;
	symbolKind: SymbolKind;

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
