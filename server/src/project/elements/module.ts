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
import { BaseRuleSyntaxElement, BaseIdentifyableSyntaxElement, HasDiagnosticCapability } from './base';
import { DiagnosticCapability, IdentifierCapability, ItemType, ScopeItemCapability, SymbolInformationCapability } from '../../capabilities/capabilities';
import { DuplicateAttributeDiagnostic, IgnoredAttributeDiagnostic, MissingAttributeDiagnostic, MissingOptionExplicitDiagnostic } from '../../capabilities/diagnostics';


interface DocumentSettings {
	doWarnOptionExplicitMissing: boolean;
}


abstract class BaseModuleElement<T extends ParserRuleContext> extends BaseIdentifyableSyntaxElement<T> {
	abstract attrubutes: ParserRuleContext[];
	abstract diagnosticCapability: DiagnosticCapability;
	abstract hasOptionExplicit: boolean;
	abstract scopeItemCapability: ScopeItemCapability;

	settings: DocumentSettings;
	symbolInformationCapability: SymbolInformationCapability;

	constructor(ctx: T, doc: TextDocument, documentSettings: DocumentSettings, symbolKind: SymbolKind) {
		super(ctx, doc);
		this.settings = documentSettings;
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
			if (isOptionExplicitDirective) return true;
		}
		return false;
	}

	private duplicateAttributes(attrs: ParserRuleContext[]) {
		const catalogue = new Map<string, null>();
		const result: ParserRuleContext[] = [];
		attrs.forEach(attr => {
			const attrName = getAttributeName(attr);
			if (catalogue.has(attrName)) {
				result.push(attr);
			} else {
				catalogue.set(attrName, null);
			}
		});
		return result;
	}
}


export class ModuleElement extends BaseModuleElement<ProceduralModuleContext> {
	diagnosticCapability: DiagnosticCapability;
	identifierCapability: IdentifierCapability;
	scopeItemCapability: ScopeItemCapability;

	attrubutes: ParserRuleContext[];
	hasOptionExplicit: boolean;

	constructor(ctx: ProceduralModuleContext, doc: TextDocument, documentSettings: DocumentSettings) {
		super(ctx, doc, documentSettings, SymbolKind.File);
		this.attrubutes = ctx.proceduralModuleHeader().proceduralModuleAttr();
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.scopeItemCapability = new ScopeItemCapability(this, ItemType.MODULE);

		this.hasOptionExplicit = this.evaluateHasOptionExplicit(ctx
			.proceduralModuleBody()
			.proceduralModuleCode()
			.proceduralModuleCodeElement());

		const getIdentifierNameContext = () => this.context.rule
			.proceduralModuleHeader()
			.proceduralModuleAttr()
			.map(x => x.nameAttr())
			.filter(x => !!x)[0]
			?.STRINGLITERAL();
		const getIdentifierFormattedName = (x: string) => x.stripQuotes();
		const getIdentifierDefaultRange = () => Range.create(this.context.range.start, this.context.range.start);

		this.identifierCapability = new IdentifierCapability(
			this,
			getIdentifierNameContext,
			getIdentifierFormattedName,
			'Unknown Module',
			getIdentifierDefaultRange
		);

		this.resolveConfiguration(
			this.diagnosticCapability.diagnostics,
			this.context.rule.proceduralModuleHeader()
		);
	}
}


export class ClassElement extends BaseModuleElement<ClassModuleContext> {
	diagnosticCapability: DiagnosticCapability;
	identifierCapability: IdentifierCapability;
	scopeItemCapability: ScopeItemCapability;

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
		this.scopeItemCapability = new ScopeItemCapability(this, ItemType.CLASS);

		this.hasOptionExplicit = this.evaluateHasOptionExplicit(ctx
			.classModuleBody()
			.classModuleCode()
			.classModuleCodeElement());

		let getIdentifierNameContext;
		if (ctx.classModuleHeader().nameAttr().length > 0) {
			getIdentifierNameContext = () => ctx
				.classModuleHeader()
				.nameAttr()[0]
				.STRINGLITERAL();
		}
		const getIdentifierFormattedName = (x: string) => x.stripQuotes();
		const getIdentifierDefaultRange = () => Range.create(this.context.range.start, this.context.range.start);

		this.identifierCapability = new IdentifierCapability(
			this,
			getIdentifierNameContext,
			getIdentifierFormattedName,
			'Unknown Class',
			getIdentifierDefaultRange
		);

		this.resolveConfiguration(
			this.diagnosticCapability.diagnostics,
			this.context.rule.classModuleHeader()
		);
	}
}


export class ModuleIgnoredAttributeElement extends BaseRuleSyntaxElement<ParserRuleContext> implements HasDiagnosticCapability {
	diagnosticCapability: DiagnosticCapability;

	constructor(ctx: IgnoredClassAttrContext | IgnoredProceduralAttrContext, doc: TextDocument) {
		super(ctx, doc);
		this.diagnosticCapability = new DiagnosticCapability(this, () => {
			this.diagnosticCapability.diagnostics.push(new IgnoredAttributeDiagnostic(
				this.context.range, this.context.text.split(' ')[1]
			));
			return this.diagnosticCapability.diagnostics;
		});
	}
}


// TODO: Move to helpers.
function getAttributeName(e: ParserRuleContext): string {
	return e.getText().split(' ')[1];
}