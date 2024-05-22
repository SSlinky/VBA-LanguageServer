import { Range, SymbolKind } from 'vscode-languageserver';
import { BaseTypeContext, ComplexTypeContext } from '../antlr/out/vbaParser';
import { TextDocument } from 'vscode-languageserver-textdocument';
// import { ParserRuleContext } from 'antlr4ts';

// This extension throws a compiler error TS2693: 'ParserRuleContext' only refers to a type, but is being used as a value here.
// Can maybe review later down the track, but for now have just made it a private method on BaseSyntaxElement.
// declare module 'antlr4ts' {
//    export interface ParserRuleContext {
//       toRange(document: TextDocument): Range;
//    }
// }

// ParserRuleContext.prototype.toRange = function (document: TextDocument): Range {
//    const startIndex = this.start.startIndex;
//    const stopIndex = this.stop?.stopIndex ?? startIndex;
//    return Range.create(
//       document.positionAt(startIndex),
//       document.positionAt(stopIndex)
//    );
// };


declare module '../antlr/out/vbaParser' {
	export interface BaseTypeContext {
		toSymbolKind(): SymbolKind;
	}

   export interface ComplexTypeContext {
		toSymbolKind(): SymbolKind;
	}
}

BaseTypeContext.prototype.toSymbolKind = function (): SymbolKind {
   return toSymbolKind(this);
};

ComplexTypeContext.prototype.toSymbolKind = function (): SymbolKind {
   return toSymbolKind(this);
};

function toSymbolKind(context: BaseTypeContext | ComplexTypeContext): SymbolKind {
	switch (context.text.toLocaleLowerCase()) {
		case 'boolean':
			return SymbolKind.Boolean;
		case 'byte':
		case 'string':
			return SymbolKind.String;
		case 'double':
		case 'currency':
      case 'integer':
		case 'long':
		case 'longPtr':
		case 'longLong':
			return SymbolKind.Number;
		case 'object':
			return SymbolKind.Object;
		default:
			return SymbolKind.Class;
	}
}

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