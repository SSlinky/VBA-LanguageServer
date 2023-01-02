import { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity } from 'vscode-languageserver';
import { AmbiguousIdentifierContext, CertainIdentifierContext } from '../antlr/out/vbaParser';
import { MethodElement, SyntaxElement, VariableDeclarationElement } from './vbaSyntaxElements';


enum NameLinkType {
	'variable' = 0,
	'method' = 1,
}

class Scope {
	context: SyntaxElement;
	parent?: Scope;
	nameRefs: Map<string, NameLink> = new Map();

	constructor(ctx: SyntaxElement);
	constructor(ctx: SyntaxElement, pnt: Scope);
	constructor(ctx: SyntaxElement, pnt?: Scope) {
		this.context = ctx;
		this.parent = pnt;
	}

	addDeclaration(element: VariableDeclarationElement | MethodElement) {
		//
	}

	addRef(ctx: CertainIdentifierContext | AmbiguousIdentifierContext) {
		const nameLink = this.getName(ctx.text);
		// if dec

		// if not dec
	}

	getName(identifier: string): NameLink {
		if (!this.nameRefs.has(identifier)) {
			this.nameRefs.set(identifier, new NameLink());
		}
		return this.nameRefs.get(identifier)!;
	}
}

class NameLink {
	type: NameLinkType = NameLinkType.variable;

	// The original decalarations that affect this name.
	// 0: Variable or method not declared.
	// 1: Declared once.
	// 2: Multiple conflicting declarations.
	declarations: SyntaxElement[] = [];

	// The places this name is referenced.
	references: SyntaxElement[] = [];
	diagnostics: Diagnostic[] = [];

	private diagnosticRelatedInfo: DiagnosticRelatedInformation[] = [];

	merge(link: NameLink) {
		this.declarations.concat(link.declarations);
		this.references.concat(link.references);
		this.diagnostics.concat(link.diagnostics);

		if (link.declarations.length > 0) {
			this.type = link.type;
		}
	}

	process(optExplicit = false) {
		this.processDiagnosticRelatedInformation();
		this.validateDeclarationCount(optExplicit);
		this.validateMethodSignatures();

		this.assignSemanticTokens();
		this.assignDiagnostics();
	}

	private processDiagnosticRelatedInformation() {
		this.diagnosticRelatedInfo = this.declarations
			.concat(this.references)
			.map((x) => DiagnosticRelatedInformation.create(
				x.location(),
				x.text
			));
	}

	private validateDeclarationCount(optExplicit: boolean) {
		if (this.declarations.length === 1) {
			return;
		}

		const undecSeverity = (optExplicit) ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning;
		if (this.declarations.length === 0) {
			if (optExplicit || this.type !== NameLinkType.variable)
				this.references.forEach((x) =>
					this.diagnostics.push(Diagnostic.create(
						x.range,
						"No declaration for variable or method.",
						undecSeverity,
						404,
						'VbaPro',
						this.diagnosticRelatedInfo
					)));
			return;
		}
		this.declarations.forEach((x) =>
			this.diagnostics.push(Diagnostic.create(
				x.range,
				"Ambiguous variable declaration",
				DiagnosticSeverity.Error,
				500,
				'VbaPro',
				this.diagnosticRelatedInfo
			)));
	}

	private assignSemanticTokens() {
		if (this.declarations.length === 0) {
			return;
		}

		this.references.forEach((x) => x.semanticToken = 
			this.declarations[0]
				.semanticToken
				?.toNewRange(x.range));
	}

	private assignDiagnostics() {
		if (this.diagnostics.length === 0) {
			return;
		}
		const els = this.declarations.concat(this.references);
		els.forEach((x) => x.addDiagnostics(this.diagnostics));
	}

	private validateMethodSignatures() {
		// TODO: implement.
	}
}