// Core
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, Range, SymbolKind } from 'vscode-languageserver';

// Antlr
import { ParserRuleContext } from 'antlr4ng';
import {
	ClassModuleCodeElementContext,
	ClassModuleContext,
	ClassModuleHeaderContext,
	IgnoredClassAttrContext,
	IgnoredProceduralAttrContext,
	ProceduralModuleCodeElementContext,
	ProceduralModuleContext,
	ProceduralModuleHeaderContext
} from '../../antlr/out/vbaParser';

// Project
import { BaseContextSyntaxElement, BaseIdentifyableSyntaxElement, HasDiagnosticCapability } from './base';
import { DiagnosticCapability, FoldingRangeCapability, IdentifierCapability, SymbolInformationCapability } from '../../capabilities/capabilities';
import { DuplicateAttributeDiagnostic, IgnoredAttributeDiagnostic, MissingAttributeDiagnostic, MissingOptionExplicitDiagnostic } from '../../capabilities/diagnostics';


interface DocumentSettings {
	doWarnOptionExplicitMissing: boolean;
}


abstract class BaseModuleElement<T extends ParserRuleContext> extends BaseIdentifyableSyntaxElement<T> {
	abstract attrubutes: ParserRuleContext[];
	abstract diagnosticCapability: DiagnosticCapability;
	abstract hasOptionExplicit: boolean;
	
	settings: DocumentSettings;
	foldingRangeCapability: FoldingRangeCapability;
	symbolInformationCapability: SymbolInformationCapability;

	constructor(ctx: T, doc: TextDocument, documentSettings: DocumentSettings, symbolKind: SymbolKind) {
		super(ctx, doc);
		this.settings = documentSettings;
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.symbolInformationCapability = new SymbolInformationCapability(this, symbolKind);
	}

	// Helpers
	protected addMissingAttributesDiagnostics(diagnostics: Diagnostic[]): void {
		if (!this.identifierCapability.isDefaultMode) return;
		diagnostics.push(new MissingAttributeDiagnostic(
			Range.create(this.context.range.start, this.context.range.start),
			'VB_NAME'
		));
	}

	protected addDuplicateAttributeDiagnostics(diagnostics: Diagnostic[]): void {
		this.duplicateAttributes(this.attrubutes).forEach(attr =>
			diagnostics.push(new DuplicateAttributeDiagnostic(
				attr.toRange(this.context.document),
				getAttributeName(attr)
			))
		);
	}

	protected addOptionExplicitMissingDiagnostic(diagnostics: Diagnostic[], header: ClassModuleHeaderContext | ProceduralModuleHeaderContext): void {
		if (this.settings.doWarnOptionExplicitMissing && !this.hasOptionExplicit) {
			const startLine = header.stop?.line ?? 0 + 1;
			diagnostics.push(new MissingOptionExplicitDiagnostic(
				Range.create(startLine, 1, startLine, 1)
			));
		}
	}

	protected resolveConfiguration(diagnostics: Diagnostic[], header: ClassModuleHeaderContext | ProceduralModuleHeaderContext): void {
		this.addMissingAttributesDiagnostics(diagnostics);
		this.addDuplicateAttributeDiagnostics(diagnostics);
		this.addOptionExplicitMissingDiagnostic(diagnostics, header);
	}

	protected evaluateHasOptionExplicit(codeElements: (ProceduralModuleCodeElementContext | ClassModuleCodeElementContext)[]): boolean {
		for (const codeElement of codeElements) {
			const isOptionExplicitDirective = codeElement
				.commonModuleCodeElement()
				?.commonOptionDirective()
				?.optionExplicitDirective();
			if (!!isOptionExplicitDirective) return true;
		}
		return false;
	}

	private duplicateAttributes(attrs: ParserRuleContext[]) {
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
}


export class ModuleElement extends BaseModuleElement<ProceduralModuleContext> {
	diagnosticCapability: DiagnosticCapability;
	identifierCapability: IdentifierCapability;

	attrubutes: ParserRuleContext[];
	hasOptionExplicit: boolean;

	constructor(ctx: ProceduralModuleContext, doc: TextDocument, documentSettings: DocumentSettings) {
		super(ctx, doc, documentSettings, SymbolKind.File);
		this.attrubutes = ctx.proceduralModuleHeader().proceduralModuleAttr();
		this.diagnosticCapability = new DiagnosticCapability(this);

		this.hasOptionExplicit = this.evaluateHasOptionExplicit(ctx
			.proceduralModuleBody()
			.proceduralModuleCode()
			.proceduralModuleCodeElement());

		this.identifierCapability = new IdentifierCapability({
			element: this,
			formatName: (x: string) => x.stripQuotes(),
			defaultName: 'Unknown Module',
			defaultRange: () => Range.create(this.context.range.start, this.context.range.start),
			getNameContext: () => ctx
				.proceduralModuleHeader()
				.proceduralModuleAttr()
				.map(x => x.nameAttr())
				.filter(x => !!x)[0]
				?.STRINGLITERAL()
		});

		this.resolveConfiguration(
			this.diagnosticCapability.diagnostics,
			this.context.rule.proceduralModuleHeader()
		);
	}
}


export class ClassElement extends BaseModuleElement<ClassModuleContext> {
	diagnosticCapability: DiagnosticCapability;
	identifierCapability: IdentifierCapability;

	attrubutes: ParserRuleContext[];
	hasOptionExplicit: boolean;

	constructor(ctx: ClassModuleContext, doc: TextDocument, documentSettings: DocumentSettings) {
		super(ctx, doc, documentSettings, SymbolKind.File);
		this.attrubutes = [
			ctx.classModuleHeader().nameAttr(),
			ctx.classModuleHeader().classAttr(),
			ctx.classModuleHeader().ignoredClassAttr()
		].flat();
		this.diagnosticCapability = new DiagnosticCapability(this);

		this.hasOptionExplicit = this.evaluateHasOptionExplicit(ctx
			.classModuleBody()
			.classModuleCode()
			.classModuleCodeElement());

		this.identifierCapability = new IdentifierCapability({
			element: this,
			formatName: (x: string) => x.stripQuotes(),
			defaultName: 'Unknown Class',
			defaultRange: () => Range.create(this.context.range.start, this.context.range.start),
			getNameContext: () => ctx
				.classModuleHeader()
				.nameAttr()[0]
				.STRINGLITERAL()
		});

		this.resolveConfiguration(
			this.diagnosticCapability.diagnostics,
			this.context.rule.classModuleHeader()
		);
	}
}


export class ModuleIgnoredAttributeElement extends BaseContextSyntaxElement<ParserRuleContext> implements HasDiagnosticCapability {
	diagnosticCapability: DiagnosticCapability;

	constructor(ctx: IgnoredClassAttrContext | IgnoredProceduralAttrContext, doc: TextDocument) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this, () => {
			this.diagnosticCapability.diagnostics.push(new IgnoredAttributeDiagnostic(
				this.context.range, this.context.text.split(' ')[1]
			));
			return this.diagnosticCapability.diagnostics;
		})
	}
}


// TODO: Move to helpers.
function getAttributeName(e: ParserRuleContext): string {
	return e.getText().split(' ')[1]
}