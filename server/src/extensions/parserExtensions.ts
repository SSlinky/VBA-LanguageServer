import { ParserRuleContext } from 'antlr4ng';
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

declare module 'antlr4ng' {
	interface ParserRuleContext {
		toRange(doc: TextDocument): Range;
	}
}


/**
 * Convert the context to a range.
 */
ParserRuleContext.prototype.toRange = function (doc: TextDocument): Range {
	const startIndex = this.start?.start ?? 0;
	const stopIndex = this.stop?.stop ?? startIndex;
	return Range.create(
		doc.positionAt(startIndex),
		doc.positionAt(stopIndex + 1)
	);
};

// declare module '../antlr/out/vbaParser' {
// 	export interface BaseTypeContext {
// 		toSymbolKind(): SymbolKind;
// 	}

//    export interface ComplexTypeContext {
// 		toSymbolKind(): SymbolKind;
// 	}
// }

// BaseTypeContext.prototype.toSymbolKind = function (): SymbolKind {
//    return toSymbolKind(this);
// };

// ComplexTypeContext.prototype.toSymbolKind = function (): SymbolKind {
//    return toSymbolKind(this);
// };

// function toSymbolKind(context: BaseTypeContext | ComplexTypeContext): SymbolKind {
// 	switch (context.text.toLocaleLowerCase()) {
// 		case 'boolean':
// 			return SymbolKind.Boolean;
// 		case 'byte':
// 		case 'string':
// 			return SymbolKind.String;
// 		case 'double':
// 		case 'currency':
//       case 'integer':
// 		case 'long':
// 		case 'longPtr':
// 		case 'longLong':
// 			return SymbolKind.Number;
// 		case 'object':
// 			return SymbolKind.Object;
// 		default:
// 			return SymbolKind.Class;
// 	}
// }

/**
 *  const File: 1;
    const Module: 2;
    const Namespace: 3;
    const Package: 4;
    const Class: 5;
    const Method: 6;
    const Property: 7;
    const Field: 8;
    const Constructor: 9;
    const Enum: 10;
    const Interface: 11;
    const Function: 12;
    const Variable: 13;
    const Constant: 14;
    const String: 15;
    const Number: 16;
    const Boolean: 17;
    const Array: 18;
    const Object: 19;
    const Key: 20;
    const Null: 21;
    const EnumMember: 22;
    const Struct: 23;
    const Event: 24;
    const Operator: 25;
    const TypeParameter: 26;
 */