import { BaseContextSyntaxElement, HasDiagnosticCapability } from './base';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic } from 'vscode-languageserver';
import { MultipleOperatorsDiagnostic } from '../../capabilities/diagnostics';


// export class OperatorElement extends BaseContextSyntaxElement implements HasDiagnosticCapability {
// 	diagnostics: Diagnostic[] = [];

// 	constructor(context: OperatorsStmtContext, document: TextDocument) {
// 		super(context, document);
// 	}

// 	evaluateDiagnostics(): void {
// 		if (this.context.childCount > 1) {
// 			this.diagnostics.push(new MultipleOperatorsDiagnostic(this.range));
// 		}
// 	}
// }
