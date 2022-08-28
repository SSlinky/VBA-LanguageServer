import { Range, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';


export class DocumentSymbolProvider {
	docUri = '';
	docAncestors: SymbolInformation[] = [];
	requiresName = false;
	private symbols: Map<string, SymbolInformation[]>;
	private attributes: Map<string, string>;
	Symbols = (): SymbolInformation[] => this.symbols.get(this.docUri)!;

	constructor() {
		this.symbols = new Map<string, []>();
		this.attributes = new Map<string, string>();
	}

	setDoc(doc: TextDocument): void {
		this.docUri = doc.uri;
		this.docAncestors.splice(0);
		this.symbols.set(this.docUri, []);
	}

	addSymbol(range: Range, name: string, kind: SymbolKind) {
		const containerName = this.getContainerName(range);
		this.symbols.get(this.docUri)!.push(
			SymbolInformation.create(
				name,
				kind,
				range,
				this.docUri,
				containerName,
			)
		);
		if (name.toLowerCase().startsWith('unnamed')) {
			this.requiresName = true;
		}
	}

	addAttribute(name: string, value: string) {
		this.attributes.set(name, value);
		switch (name) {
			case 'VB_Name':
				this.getModule().name = value;
				break;
		}
	}

	nameLastSymbol(name: string) {
		if (!this.requiresName) { return; }
		const s = this.Symbols()[this.Symbols().length - 1];
		s.name = name;
		this.requiresName = false;
	}

	nameModule(name: string) {
		this.getModule().name = name;
	}

	setModuleKind(kind: SymbolKind) {
		this.getModule().kind = kind;
	}

	private getModule(): SymbolInformation {
		return this.Symbols()[0];
	}

	private getContainerName(range: Range): string {
		while (this.docAncestors.length > 0) {
			const container = this.docAncestors[this.docAncestors.length - 1];
			if (container.location.range.end.line < range.start.line) {
				this.docAncestors.pop();
				continue;
			}
			if (container.location.range.end.character < range.start.character) {
				this.docAncestors.pop();
				continue;
			}
			return container.name;
		}
		return '';
	}
}

