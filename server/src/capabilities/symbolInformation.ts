import { SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { NamedSyntaxElement } from '../project/elements/base';


export class SymbolInformationFactory {
	static create(element: NamedSyntaxElement, symbolKind: SymbolKind): SymbolInformation {
		return SymbolInformation.create(
			element.name,
			symbolKind,
			element.range,
			element.uri
		);
	}
}

