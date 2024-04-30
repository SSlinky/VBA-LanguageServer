import { ANTLRInputStream, CommonTokenStream, ConsoleErrorListener, ParserRuleContext, RecognitionException, Recognizer } from 'antlr4ts';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { vbaListener } from '../antlr/out/vbaListener';
import { AttributeStmtContext, ConstStmtContext, DocstringStmtContext, EnumerationStmtContext, EnumerationStmt_ConstantContext, FoldingBlockStmtContext, MethodStmtContext, IfThenElseStmtContext, ImplicitCallStmt_InBlockContext, ImplicitCallStmt_InStmtContext, LetStmtContext, ModuleContext, ModuleHeaderContext, SetStmtContext, StartRuleContext, UnknownLineContext, VariableStmtContext, vbaParser, PropertyStmtContext, ICS_S_VariableOrProcedureCallContext, ICS_S_MembersCallContext, AmbiguousIdentifierContext, ModuleConfigContext, ArgListContext } from '../antlr/out/vbaParser';
import { vbaLexer as VbaLexer } from '../antlr/out/vbaLexer';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { DocstringElement, MethodElement } from './elements/method';
import { SymbolKind } from 'vscode-languageserver';
import { ModuleAttribute, ModuleElement } from './elements/module';
import { FoldableElement, SyntaxElement } from './elements/base';
import { VariableAssignElement, VariableDeclarationElement, VariableStatementElement } from './elements/variable';
import { EnumConstantElement, EnumElement } from './elements/vbLang';


export interface ResultsContainer {
    module?: ModuleElement;
    addModule(element: ModuleElement): void;
    addElement(element: SyntaxElement): ResultsContainer;
    addScopeReferences(emt: VariableAssignElement): void;
    addScopeDeclaration(emt: MethodElement | VariableDeclarationElement): void;
    addFoldingRange(emt: FoldableElement): void;
}

// TODO: Break down into smaller blocks of work.
// The parser is attempting to parse all of VBA. It would be more efficient to parse each function separately.
// A pre-parser should detect module level elements, and if anything has changed, the element should be re-parsed
// using the lower parser, e.g., funcitons / subs / props / decs, etc. The part of the document that has changed
// should also force a refresh to that specific element.
export class SyntaxParser {
    parse(doc: TextDocument, resultsContainer: ResultsContainer) {
        const listener = new VbaTreeWalkListener(doc, resultsContainer);
        const parser = this.createParser(doc);

        ParseTreeWalker.DEFAULT.walk(
            listener,
            parser.startRule()
        );
    }

    private createParser(doc: TextDocument): vbaParser {
        const lexer = new VbaLexer(new ANTLRInputStream(doc.getText()));
        const parser = new vbaParser(new CommonTokenStream(lexer));

        parser.removeErrorListeners();
        parser.addErrorListener(new VbaErrorListener());
        return parser;
    }
}

class VbaTreeWalkListener implements vbaListener {
    doc: TextDocument;
    resultsContainer: ResultsContainer;

    // State flags
    inModuleConfig = false;
    inAttributeStatement = false;
    inDeclarationStatement = false;

    constructor(doc: TextDocument, resultsContainer: ResultsContainer) {
        this.doc = doc;
        this.resultsContainer = resultsContainer;
    }

    enterFoldingBlockStmt = (ctx: FoldingBlockStmtContext) =>
        this.registerFoldingRange(ctx);

    enterIfThenElseStmt?: ((ctx: IfThenElseStmtContext) => void) | undefined;

    visitErrorNode(node: ErrorNode) {
        console.log(node.payload);
    }

    enterUnknownLine = (ctx: UnknownLineContext) => {
        console.log(ctx.text);
    };

    enterModule = (ctx: ModuleContext) =>
        this.resultsContainer.addModule(
            new ModuleElement(ctx, this.doc));

    // Only classes have a header. TODO: Test this for forms.
    enterModuleHeader = (_: ModuleHeaderContext) =>
        this.resultsContainer.module!.symbolKind = SymbolKind.Class;

    enterAttributeStmt = (ctx: AttributeStmtContext) => {
        this.inAttributeStatement = true;
        const attr = new ModuleAttribute(ctx, this.doc);
        // this.resultsContainer.setModuleAttribute(attr);
        if (attr.identifier?.text === 'VB_Name') {
            const module = this.resultsContainer.module;
            if (module) {
                module.identifier = attr.literal;
            }
        }
    };

    exitAttributeStmt = (_: AttributeStmtContext) => this.inAttributeStatement = false;

    enterModuleConfig = (_: ModuleConfigContext) => this.inModuleConfig = true;
    exitModuleConfig = (_: ModuleConfigContext) => this.inModuleConfig = false;

    enterMethodStmt = (ctx: MethodStmtContext) => {
        const e = new MethodElement(ctx, this.doc);
        this.registerFoldingRange(ctx);
        this.resultsContainer
            .addElement(e)
            .addScopeDeclaration(e);
    };

    enterPropertyStmt = (ctx: PropertyStmtContext) => {
        const e = new MethodElement(ctx, this.doc);
        this.registerFoldingRange(ctx);
        this.resultsContainer
            .addElement(e)
            .addScopeDeclaration(e);
    };

    enterDocstringStmt = (ctx: DocstringStmtContext) =>
        this.resultsContainer.addElement(
            new DocstringElement(ctx, this.doc)
        );

    enterEnumerationStmt = (ctx: EnumerationStmtContext) => {
        this.resultsContainer.addElement(
            new EnumElement(ctx, this.doc));
        this.registerFoldingRange(ctx);
    };

    enterEnumerationStmt_Constant = (ctx: EnumerationStmt_ConstantContext) =>
        this.resultsContainer.addElement(
            new EnumConstantElement(ctx, this.doc));

    enterVariableStmt = (ctx: VariableStmtContext) => this.enterVarOrConstStmt(ctx);
    enterConstStmt = (ctx: ConstStmtContext) => this.enterVarOrConstStmt(ctx);

    private enterVarOrConstStmt(ctx: VariableStmtContext | ConstStmtContext) {
        const declaration = new VariableStatementElement(ctx, this.doc);
        this.resultsContainer.addElement(declaration);
        declaration.variableList.forEach((v) => this.resultsContainer.addScopeDeclaration(v));
    }

    enterImplicitCallStmt_InStmt = (ctx: ImplicitCallStmt_InStmtContext) => this.enterImplicitCallStmt(ctx);
    enterImplicitCallStmt_InBlock = (ctx: ImplicitCallStmt_InBlockContext) => this.enterImplicitCallStmt(ctx);

    private enterImplicitCallStmt(ctx: ImplicitCallStmt_InStmtContext | ImplicitCallStmt_InBlockContext) {
        // console.log('imp call ' + ctx.text);
    }

    enterICS_S_MembersCall?: ((ctx: ICS_S_MembersCallContext) => void) | undefined;
    enterICS_S_VariableOrProcedureCall?: ((ctx: ICS_S_VariableOrProcedureCallContext) => void) | undefined;

    enterAmbiguousIdentifier = (ctx: AmbiguousIdentifierContext) => {
        if (this.inModuleConfig || this.inAttributeStatement)
            return;

        // if(ctx.ambiguousKeyword(0).text == "Me") {
        // 	console.log(`me: ${ctx.text}`);
        // }

        try {
            if (ctx.ambiguousKeyword().length == 0) {
                const ctxText = ctx.text;
                let pntText = ctxText;
                let pnt: ParserRuleContext = ctx;

                while (ctxText == pntText && pnt.parent) {
                    pnt = pnt.parent;
                    pntText = pnt.text;
                }

                console.log(`ident: ${ctxText}: ${pntText}`);
                return;
            }
            if(ctx.ambiguousKeyword(0).text == "Me") {
                console.log(`ident: ${ctx.text}`);
            }
        }
        catch (e: any) {
            console.log(`error: ${ctx.toString()}`);
            console.log(e);
        }
    };


    enterLetStmt = (ctx: LetStmtContext) => this.enterAssignStmt(ctx);
    enterSetStmt = (ctx: SetStmtContext) => this.enterAssignStmt(ctx);

    private enterAssignStmt(ctx: LetStmtContext | SetStmtContext) {
        try {
            const assignment = new VariableAssignElement(ctx, this.doc);
            this.resultsContainer
                .addElement(assignment)
                .addScopeReferences(assignment);

            // Need to add a variable or call reference element.
            // Should also take into account literals. And I don't think
            // the logic should be here - add method to resultsContainer
            // const left = ctx.implicitCallStmt_InStmt();

            // const right = ctx.valueStmt();
            // this.resultsContainer.addScopeReference(assignment.leftImplicitCall)
        }
        catch (e) {
            console.log(`ERROR: ${ctx.text}\n${e}`);
        }
    }

    private registerFoldingRange(ctx: ParserRuleContext) {
        this.resultsContainer.addFoldingRange(
            new FoldableElement(ctx, this.doc));
    }
}

class VbaErrorListener extends ConsoleErrorListener {
    syntaxError<T>(recognizer: Recognizer<T, any>, offendingSymbol: T, line: number, charPositionInLine: number, msg: string, e: RecognitionException | undefined): void {
        super.syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e);
        console.error(e);
        if (e) {
            const y = recognizer.getErrorHeader(e);
            console.log(y);
        }
        recognizer.inputStream?.consume();
    }
}