import { SymbolKind } from 'vscode-languageserver';


export function vbaTypeToSymbolConverter(t: string): SymbolKind {
	switch (t.toLocaleLowerCase()) {
		case 'boolean':
			return SymbolKind.Boolean;
		case 'single':
		case 'double':
		case 'currency':
		case 'long':
		case 'longlong':
		case 'longptr':
			return SymbolKind.Number;
		case 'string':
			return SymbolKind.String;
		case 'variant':
			return SymbolKind.Variable;
		default:
			return SymbolKind.Object;
	}
}