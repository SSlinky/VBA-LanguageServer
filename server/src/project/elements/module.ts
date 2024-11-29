import { Diagnostic, Range, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { ParserRuleContext } from 'antlr4ng';
import { ClassModuleContext, IgnoredClassAttrContext, IgnoredProceduralAttrContext, ProceduralModuleContext } from '../../antlr/out/vbaParser';

import { BaseContextSyntaxElement, HasDiagnosticCapability, HasSymbolInformation } from './base';
import { ScopeElement } from './special';

import { SymbolInformationFactory } from '../../capabilities/symbolInformation';
import { DuplicateAttributeDiagnostic, IgnoredAttributeDiagnostic, MissingAttributeDiagnostic, MissingOptionExplicitDiagnostic } from '../../capabilities/diagnostics';

import '../../extensions/stringExtensions';
import { contextToRange } from '../../utils/helpers';

interface DocumentSettings {
	doWarnOptionExplicitMissing: boolean;
}

abstract class BaseModuleElement extends ScopeElement implements HasSymbolInformation, HasDiagnosticCapability {
	protected abstract _name: string;
	symbolKind: SymbolKind;
	diagnostics: Diagnostic[] = [];
	context: ProceduralModuleContext | ClassModuleContext;
	settings: DocumentSettings;
	isPublic = true;

	constructor(context: ProceduralModuleContext | ClassModuleContext, document: TextDocument, symbolKind: SymbolKind, documentSettings: DocumentSettings) {
		super(context, document);
		this.context = context;
		this.symbolKind = symbolKind;
		this.settings = documentSettings;
	}

	get name(): string {
		return this._name;
	}

	get symbolInformation(): SymbolInformation {
		return SymbolInformationFactory.create(
			this, this.symbolKind
		);
	}

	abstract evaluateDiagnostics(): Diagnostic[];

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

	protected _duplicateAttributes(attrs: ParserRuleContext[]) {
		const catalogue = new Map<string, null>();
		const result: ParserRuleContext[] = [];
		attrs.forEach(attr => {
			const attrName = getAttributeName(attr);
			if (catalogue.has(attrName)) {
				result.push(attr)
			} else {
				catalogue.set(attrName, null);
			}
		})
		return result;
	}

	private _isClassModule(context: ProceduralModuleContext | ClassModuleContext): context is ClassModuleContext {
		return 'classModuleHeader' in context;
	} 
}

export class ModuleElement extends BaseModuleElement {
	context: ProceduralModuleContext;
	attrubutes: ParserRuleContext[];
	protected _name: string;

	constructor(context: ProceduralModuleContext, document: TextDocument, documentSettings: DocumentSettings) {
		super(context, document, SymbolKind.File, documentSettings);
		this.context = context;
		this.attrubutes = context.proceduralModuleHeader().proceduralModuleAttr();
		this._name = this._getName(context);
	}

	evaluateDiagnostics() {
		// Diagnose duplicate attributes.
		this._duplicateAttributes(this.attrubutes).forEach(attr =>
			this.diagnostics.push(new DuplicateAttributeDiagnostic(
				contextToRange(this.document, attr)!,
				getAttributeName(attr)
			))
		);

		// Diagnose option explicit is missing.
		if (this.settings.doWarnOptionExplicitMissing && !this._hasOptionExplicit) {
			const header = this.context.proceduralModuleHeader();
			const startLine = header.stop?.line ?? 0 + 1;
			this.diagnostics.push(new MissingOptionExplicitDiagnostic(
				Range.create(
					startLine, 1,
					startLine, 1
				)
			));
		}

		return this.diagnostics;
	}

	private _getName(context: ProceduralModuleContext) {
		const attributes = context.proceduralModuleHeader().proceduralModuleAttr();
		const nameAttributes = attributes.map(x => x.nameAttr()).filter(x => !!x)
		
		// If we don't have any name attributes...
		if (nameAttributes.length === 0) {
			this.diagnostics.push(new MissingAttributeDiagnostic(
				Range.create(this.range.start, this.range.start),
				'VB_NAME'
			));
			return 'Unknown Module';
		}

		// Get the name from the name attribute.
		const name = nameAttributes[0].STRINGLITERAL().getText();
		return name.stripQuotes();
	}
}

export class ClassElement extends BaseModuleElement {
	context: ClassModuleContext;
	attrubutes: ParserRuleContext[];
	protected _name: string;

	constructor(context: ClassModuleContext, document: TextDocument, documentSettings: DocumentSettings) {
		super(context, document, SymbolKind.Class, documentSettings);
		this.context = context;
		this.attrubutes = [
			context.classModuleHeader().nameAttr(),
			context.classModuleHeader().classAttr(),
			context.classModuleHeader().ignoredClassAttr()
		].flat();
		this._name = this._getName(context);
	}

	evaluateDiagnostics() {
		// Diagnose duplicate attributes.
		this._duplicateAttributes(this.attrubutes).forEach(attr =>
			this.diagnostics.push(new DuplicateAttributeDiagnostic(
				attr.toRange(this.document),
				getAttributeName(attr)
			))
		);

		// Diagnose option explicit is missing.
		if (this.settings.doWarnOptionExplicitMissing && !this._hasOptionExplicit) {
			const header = this.context.classModuleHeader();
			const startLine = header.stop?.line ?? 0 + 1;
			this.diagnostics.push(new MissingOptionExplicitDiagnostic(
				Range.create(
					startLine, 1,
					startLine, 1
				)
			));
		}
		return this.diagnostics
	}

	private _getName(context: ClassModuleContext) {
		const nameAttributes = context.classModuleHeader().nameAttr();

		// TODO: Check if other attributes are required and validate them.
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

	constructor(context: IgnoredClassAttrContext | IgnoredProceduralAttrContext, document: TextDocument) {
		super(context, document);
	}

	evaluateDiagnostics() {
		this.diagnostics.push(
			new IgnoredAttributeDiagnostic(
				this.range,
				this.context.getText().split(' ')[1]
			)
		);
		return this.diagnostics
	}

}

function getAttributeName(e: ParserRuleContext): string {
	return e.getText().split(' ')[1]
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