// Core
import { Range, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ParserRuleContext, TerminalNode } from 'antlr4ng';

// Project
import { CompilerConditionalStatementContext } from '../antlr/out/vbapreParser';
import {
   AmbiguousIdentifierContext,
	BuiltinTypeContext,
	ClassTypeNameContext,
	ConstItemContext,
	EndOfStatementContext,
	EndOfStatementNoWsContext,
	GlobalVariableDeclarationContext,
	PrivateConstDeclarationContext,
	PrivateVariableDeclarationContext,
	ProcedureTailContext,
	PublicConstDeclarationContext,
	PublicVariableDeclarationContext,
	TypeSpecContext,
	TypeSuffixContext,
	VariableDclContext,
	WitheventsVariableDclContext
} from '../antlr/out/vbaParser';
import { LineEndingContext } from '../antlr/out/vbafmtParser';


declare module 'antlr4ng' {
	interface ParserRuleContext {
      /** Convert the node to a range. */
		toRange(doc: TextDocument): Range;
      startIndex(): number;
      stopIndex(): number;
      hasPositionOf(ctx: ParserRuleContext): boolean;
      endsWithLineEnding: boolean;
      countTrailingLineEndings(): number;
	}

   interface TerminalNode {
      /** Convert the node to a range. */
      toRange(doc: TextDocument): Range;
      startIndex(): number;
      stopIndex(): number;
   }
}


declare module '../antlr/out/vbapreParser' {
   interface CompilerConditionalStatementContext {
      vbaExpression(): string;
   }
}


declare module '../antlr/out/vbaParser' {
   interface PublicConstDeclarationContext {
      /** Shortcut to get the declaration contexts. */
      declarationContexts(): ConstItemContext[];
   }

   interface PrivateConstDeclarationContext {
      /** Shortcut to get the declaration contexts. */
      declarationContexts(): ConstItemContext[];
   }

   interface ConstItemContext {
      /** Shortcut the identifier as we know it will always exist. */
      ambiguousIdentifier(): AmbiguousIdentifierContext;
      /** Shortcut to get the type context */
      typeContext(): BuiltinTypeContext | TypeSuffixContext | undefined;
      /** Extension method to get the symbol kind. */
      toSymbolKind(): SymbolKind;
   }

   interface PublicVariableDeclarationContext {
      /** Shortcut the variable list */
      declarationContexts(): (VariableDclContext | WitheventsVariableDclContext)[];
   }

   interface PrivateVariableDeclarationContext {
      /** Shortcut the variable list */
      declarationContexts(): (VariableDclContext | WitheventsVariableDclContext)[];
   }

   interface GlobalVariableDeclarationContext {
      /** Shortcut the variable list */
      declarationContexts(): VariableDclContext[];
   }

   interface VariableDclContext {
      /** Shortcut the identifier as we know it will always exist. */
      ambiguousIdentifier(): AmbiguousIdentifierContext;
      /** Shortcut to get the type context */
      typeContext(): TypeSpecContext | TypeSuffixContext | ClassTypeNameContext | undefined;
      /** Extension method to get the symbol kind. */
      toSymbolKind(): SymbolKind;
   }

   interface WitheventsVariableDclContext {
      /** Shortcut the identifier as we know it will always exist. */
      ambiguousIdentifier(): AmbiguousIdentifierContext;
      /** Shortcut to get the type context */
      typeContext(): TypeSpecContext | TypeSuffixContext | ClassTypeNameContext | undefined;
      /** Extension method to get the symbol kind. */
      toSymbolKind(): SymbolKind;
   }
}


ParserRuleContext.prototype.toRange = function (doc: TextDocument): Range {
	const startIndex = this.start?.start ?? 0;
	const stopIndex = this.stop?.stop ?? startIndex;
	return Range.create(
		doc.positionAt(startIndex),
		doc.positionAt(stopIndex + 1)
	);
};

ParserRuleContext.prototype.startIndex = function (): number {
   return this.start?.start ?? 0;
}

ParserRuleContext.prototype.stopIndex = function (): number {
   return this.stop?.stop ?? this.startIndex();
}

ParserRuleContext.prototype.hasPositionOf = function (ctx: ParserRuleContext): boolean {
   return this.startIndex() === ctx.startIndex() && this.stopIndex() === ctx.stopIndex();
}

Object.defineProperty(ParserRuleContext.prototype, 'endsWithLineEnding', {
   get: function endsWithLineEnding() {
      // Ensure we have a context.
      if (!(this instanceof ParserRuleContext))
         return false;

      // Check last child is a line ending.
      const child = this.children.at(-1);
      if (!child)
         return false;

      // Check the various line ending contexts.
      if (child instanceof LineEndingContext)
         return true;
      if (child instanceof EndOfStatementContext)
         return true;
      if (child instanceof EndOfStatementNoWsContext)
         return true;
      if (child instanceof ProcedureTailContext)
         return true;

      // Run it again!
      if (child.getChildCount() > 0)
         return (child as ParserRuleContext).endsWithLineEnding;

      // Not a line ending and no more children.
      return false;
   }
})

interface LineEndingParserRuleContext {
   NEWLINE(): TerminalNode | null;
}

function isLineEndingParserRuleContext(ctx: unknown): ctx is LineEndingParserRuleContext {
   return typeof ctx === 'object'
       && ctx !== null
       && typeof (ctx as any).NEWLINE === 'function';
}

function countTrailingLineEndings(ctx: ParserRuleContext): number {
   // This function recursively loops through last child of
   // the context to find one that has a NEWLINE terminal node.

   // Check if we have a NEWLINE node.
   if (isLineEndingParserRuleContext(ctx)) {
      const lines = ctx.NEWLINE()?.getText();
      if (!lines) {
         return 0;
      }

      let i = 0;
      let result = 0;
      while (i < lines.length) {
         const char = lines[i];
         
         if (char === '\r') {
            result++;
            i += lines[i + 1] === '\n' ? 2 : 1;
         } else if (char === '\n') {
            result++;
            i++;
         }
      }

      return result;
   }

   // Recursive call on last child.
   const lastChild = ctx.children.at(-1);
   if (!!(lastChild instanceof ParserRuleContext)) {
      return countTrailingLineEndings(lastChild);
   }

   // If we get here, we have no trailing lines.
   return 0;
}

ParserRuleContext.prototype.countTrailingLineEndings = function (): number {
   return countTrailingLineEndings(this);
}


TerminalNode.prototype.toRange = function (doc: TextDocument): Range {
   return Range.create(
		doc.positionAt(this.startIndex()),
		doc.positionAt(this.stopIndex() + 1)
	);
};

TerminalNode.prototype.startIndex = function (): number {
   return this.getPayload()?.start ?? 0;
}

TerminalNode.prototype.stopIndex = function (): number {
   return this.getPayload()?.stop ?? this.startIndex();
}


CompilerConditionalStatementContext.prototype.vbaExpression = function (): string {
	return (this.compilerIfStatement() ?? this.compilerElseIfStatement())!
      .booleanExpression()
      .getText()
      .toLowerCase();
};


// Constants

PublicConstDeclarationContext.prototype.declarationContexts = function (): ConstItemContext[] {
   return this.moduleConstDeclaration()
      .constDeclaration()
      .constItemList()
      .constItem();
};


PrivateConstDeclarationContext.prototype.declarationContexts = function (): ConstItemContext[] {
   return this.moduleConstDeclaration()
      .constDeclaration()
      .constItemList()
      .constItem();
};


ConstItemContext.prototype.ambiguousIdentifier = function (): AmbiguousIdentifierContext {
   // A variable will always be typed or untyped.
   return this.typedNameConstItem()?.typedName().ambiguousIdentifier()
      ?? this.untypedNameConstItem()!.ambiguousIdentifier();
};

ConstItemContext.prototype.typeContext = function (): BuiltinTypeContext | TypeSuffixContext | undefined {
   return this.typedNameConstItem()?.typedName().typeSuffix()
      ?? this.untypedNameConstItem()?.constAsClause()?.builtinType()
};


// Variables

PublicVariableDeclarationContext.prototype.declarationContexts = function (): (VariableDclContext | WitheventsVariableDclContext)[] {
   const dims = this.moduleVariableDeclarationList();
   return [dims.witheventsVariableDcl(), dims.variableDcl()].flat();
};


PrivateVariableDeclarationContext.prototype.declarationContexts = function (): (VariableDclContext | WitheventsVariableDclContext)[] {
   const dims = this.moduleVariableDeclarationList();
   return [dims.witheventsVariableDcl(), dims.variableDcl()].flat();
};


GlobalVariableDeclarationContext.prototype.declarationContexts = function (): VariableDclContext[] {
   const varList = this.variableDeclarationList();
   return varList.variableDcl();
};


VariableDclContext.prototype.ambiguousIdentifier = function (): AmbiguousIdentifierContext {
   // A variable will always be typed or untyped.
   return this.typedVariableDcl()?.typedName().ambiguousIdentifier()
      ?? this.untypedVariableDcl()!.ambiguousIdentifier();
};


VariableDclContext.prototype.typeContext = function (): TypeSpecContext | TypeSuffixContext | ClassTypeNameContext | undefined {
   return this.typedVariableDcl()?.typedName().typeSuffix()
      ?? this.untypedVariableDcl()?.asClause()?.asType()?.typeSpec()
      ?? this.untypedVariableDcl()?.asClause()?.asAutoObject()?.classTypeName();
};


// SymbolKind

ConstItemContext.prototype.toSymbolKind = function (): SymbolKind {
   return toSymbolKind(this.typeContext());
};


WitheventsVariableDclContext.prototype.toSymbolKind = function (): SymbolKind {
   return toSymbolKind(this.typeContext());
};


VariableDclContext.prototype.toSymbolKind = function (): SymbolKind {
   return toSymbolKind(this.typeContext());
};


function toSymbolKind(context: BuiltinTypeContext | TypeSuffixContext | TypeSpecContext | ClassTypeNameContext | undefined): SymbolKind {
	switch (context?.getText().toLocaleLowerCase()) {
      case undefined:
         return SymbolKind.Class
		case 'boolean':
			return SymbolKind.Boolean;
      case '$': // string
		case 'byte':
		case 'string':
			return SymbolKind.String;
      case '%': // integer
      case '&': // long
      case '^': // longlong
      case '@': // decimal
      case '!': // single
      case '#': // double
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