import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, Range, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { ClassModuleContext, IgnoredAttrContext, ProceduralModuleContext } from '../../antlr/out/vbaParser';
import { BaseContextSyntaxElement, HasDiagnosticCapability, HasSymbolInformation } from './base';
import { SymbolInformationFactory } from '../../capabilities/symbolInformation';
import { IgnoredAttributeDiagnostic, MissingAttributeDiagnostic, MissingOptionExplicitDiagnostic } from '../../capabilities/diagnostics';
import '../../extensions/stringExtensions';
import { ScopeElement } from './special';


abstract class BaseModuleElement extends ScopeElement implements HasSymbolInformation, HasDiagnosticCapability {
	protected abstract _name: string;
	symbolKind: SymbolKind;
	diagnostics: Diagnostic[] = [];
	context: ProceduralModuleContext | ClassModuleContext;

	constructor(context: ProceduralModuleContext | ClassModuleContext, document: TextDocument, symbolKind: SymbolKind) {
		super(context, document);
		this.context = context;
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

	abstract evaluateDiagnostics(): void;

	protected get _hasOptionExplicit(): boolean {
		const getCodeElements = () => {
			if (this._isClassModule(this.context)) {
				return this.context.classModuleBody().classModuleCode().classModuleCodeElement()
			}
			return this.context.proceduralModuleBody().proceduralModuleCode().proceduralModuleCodeElement();
		}
		const codeElements = getCodeElements()
		if (!codeElements) {
			return false;
		}

		for (const declaration of codeElements) {
			const element = declaration.commonModuleCodeElement();
			if (element && element.commonOptionDirective()?.optionExplicitDirective()) {
				return true;
			}
		}

		return false;
	}

	private _isClassModule(context: ProceduralModuleContext | ClassModuleContext): context is ClassModuleContext {
		return 'classModuleHeader' in context;
	} 
}

export class ModuleElement extends BaseModuleElement {
	context: ProceduralModuleContext;
	protected _name: string;

	constructor(context: ProceduralModuleContext, document: TextDocument) {
		super(context, document, SymbolKind.File);
		this.context = context;
		this._name = this._getName(context);
	}

	evaluateDiagnostics(): void {
		if (!this._hasOptionExplicit) {
			const header = this.context.proceduralModuleHeader();
			const startLine = header.stop?.line ?? 0 + 1;
			this.diagnostics.push(new MissingOptionExplicitDiagnostic(
				Range.create(
					startLine, 1,
					startLine, 1
				)
			));
		}
	}

	private _getName(context: ProceduralModuleContext) {
		const nameAttribute = context.proceduralModuleHeader()?.nameAttr();
		const name = nameAttribute?.STRINGLITERAL().getText();
		
		if (!name) {
			this.diagnostics.push(new MissingAttributeDiagnostic(
				Range.create(this.range.start, this.range.start),
				'VB_NAME'
			));
		}

		return name?.stripQuotes() ?? 'Unknown Module';
	}
}

export class ClassElement extends BaseModuleElement {
	context: ClassModuleContext;
	protected _name: string;

	constructor(context: ClassModuleContext, document: TextDocument) {
		super(context, document, SymbolKind.Class);
		this.context = context;
		this._name = this._getName(context);
	}

	evaluateDiagnostics(): void {
		if (!this._hasOptionExplicit) {
			const header = this.context.classModuleHeader();
			const startLine = header.stop?.line ?? 0 + 1;
			this.diagnostics.push(new MissingOptionExplicitDiagnostic(
				Range.create(
					startLine, 1,
					startLine, 1
				)
			));
		}
	}

	private _getName(context: ClassModuleContext) {
		const nameAttributes = context.classModuleHeader().nameAttr();

		if (nameAttributes.length === 0) {
			this.diagnostics.push(new MissingAttributeDiagnostic(
				Range.create(this.range.start, this.range.start),
				'VB_NAME'
			));
			return 'Unknown Class';
		}

		const nameAttribute = nameAttributes[0];
		return nameAttribute.STRINGLITERAL().getText().stripQuotes();
	}
}

export class IgnoredAttributeElement extends BaseContextSyntaxElement implements HasDiagnosticCapability {
	diagnostics: Diagnostic[] = [];

	constructor(context: IgnoredAttrContext, document: TextDocument) {
		super(context, document);
	}

	evaluateDiagnostics(): void {
		this.diagnostics.push(
			new IgnoredAttributeDiagnostic(this.range)
		);
	}

}


// export class ModuleElement2 extends BaseContextSyntaxElement implements HasSymbolInformation, HasAttribute, HasDiagnosticCapability {
// 	private _hasName = false;
// 	private _name: string;
// 	symbolKind: SymbolKind;
// 	diagnostics: Diagnostic[] = [];

// 	constructor(context: ModuleContext, document: TextDocument, symbolKind: SymbolKind) {
// 		super(context, document);
// 		this._name = "Unknown Module";
// 		this.symbolKind = symbolKind;
// 	}

// 	get name(): string {
// 		return this._name;
// 	}

// 	get symbolInformation(): SymbolInformation {
// 		return SymbolInformationFactory.create(
// 			this, this.symbolKind
// 		);
// 	}

// 	evaluateDiagnostics(): void {
// 		const optionExplicitDiagnotic = this._getOptionExplicitDiagnostic();
// 		if (optionExplicitDiagnotic) {
// 			this.diagnostics.push(optionExplicitDiagnotic);
// 		}
// 	}

// 	private _getOptionExplicitDiagnostic(): Diagnostic | undefined {
// 		let optionExplicitFound = false;
// 		const context = this.context as ModuleContext;
// 		const declarations = context.moduleHeader().moduleDeclarations()?.moduleDeclarationsElement();

// 		if (declarations) {
// 			for (const declaration of declarations) {
// 				if ((declaration.moduleOption()?.text ?? '') === 'Option Explicit') {
// 					optionExplicitFound = true;
// 					break;
// 				}
// 			}
// 		}

// 		return optionExplicitFound ? undefined : new MissingOptionExplicitDiagnostic(
// 			(new ModuelHeaderElement(context.moduleHeader(), this.document)).range
// 		);
// 	}

// 	processAttribute(context: AttributeStmtContext): void {
// 		if (this._hasName) {
// 			return;
// 		}

// 		const text = context.text;
// 		if (text.startsWith("Attribute VB_Name = ")) {
// 			const unquote = (x: string): string =>
// 				x.replace(/^"+|"+$/g, '');

// 			this._name = unquote(text.split("= ")[1]);
// 			this._hasName = true;
// 		}
// 	}
// }

// class ModuelHeaderElement extends BaseContextSyntaxElement {
// 	constructor(context: ModuleHeaderContext, document: TextDocument) {
// 		super(context, document);
// 	}
// }