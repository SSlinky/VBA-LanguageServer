grammar vbafmt;

options {
    caseInsensitive = true;
}

// PARSER RULES
startRule
    : document EOF
    ;

endOfFile
    : ws? EOF
    ;

document
	: documentElement* endOfFile
	;

classHeader
    : ws? BEGIN endOfStatement
        classHeaderBlock
        ws? END endOfStatement
    ;

classHeaderBlock
    : documentElement+
    ;

basicStatement
    : ws? ((ambiguousComponent | keywordComponent | flowCharacter) ws*)+ endOfStatement
    ;

blankLine
    : ws? comment? NEWLINE
    ;

documentElement
	: comment
    | classHeader
    | endStatement
    | labelStatement
	| attributeStatement
    | ifElseStatement
    | preIfElseBlock
    | onErrorResumeNextStatement
    | indentAfterElement
    | outdentBeforeElement
    | outdentOnIndentAfterElement
    | caseDefaultStatement
    | caseStatement
    | basicStatement
    | blankLine
	;

indentAfterElement
    : doBlockOpen
    | enumBlockOpen
    | forBlockOpen
    | ifBlockOpen
    | methodSignature
    | selectCaseOpen
    | typeBlockOpen
    | withBlockOpen
    | whileBlockOpen
    ;

outdentOnIndentAfterElement
    : elseIfBlockOpen
    | ifBlockDefault
    ;

outdentBeforeElement
    : doBlockClose
    | enumBlockClose
    | forBlockClose
    | ifBlockOpen
    | ifBlockClose
    | methodClose
    | selectCaseClose
    | typeBlockClose
    | withBlockClose
    | whileBlockClose
    ;

attributeStatement
	: ws? ATTRIBUTE (ANYCHARS | ws | continuation | STRINGLITERAL)* endOfStatement
	;

asType
    : ws AS ws (ANYCHARS | LPAREN | RPAREN | continuation)+
    ;

visibility
	: PUBLIC
	| PRIVATE
	| GLOBAL
	;

endStatement
    : ws? END endOfStatement
    ;

enumBlockOpen
    : ws? (visibility ws)? ENUM ws ambiguousComponent endOfStatement
    ;

enumBlockClose
    : ws? END ws ENUM
    ;

// enumBlock
//     : enumBlockOpen
//         block?
//         enumBlockClose
//     ;

typeBlockOpen
    : ws? (visibility ws)? TYPE ws ambiguousComponent endOfStatement
    ;

typeBlockClose
    : ws? END ws TYPE
    ;

// typeBlock
//     : typeBlockOpen
//         block?
//         typeBlockClose
//     ;

labelStatement
    : ws? ambiguousComponent COLON
    ;

methodSignature
    : methodOpen ws? methodParameters
    ;

methodOpen
    : ws? (visibility ws)? (SUB | FUNCTION | (PROPERTY ws ANYCHARS)) ws ANYCHARS
    ;

methodParameters
    : LPAREN (ANYCHARS | AS | STRINGLITERAL | flowCharacter | ws)* RPAREN asType?
    ;

methodClose
    : ws? END ws (SUB | FUNCTION | PROPERTY)
    ;

withBlockOpen
    : ws? WITH ws expression+ endOfStatement
    ;

withBlockClose
    : ws? END ws WITH endOfStatement
    ;

// withBlock
//     : withBlockOpen
//         block?
//         withBlockClose
//     ;

block
    : (documentElement endOfStatement?)+
    ;

preBlock
    : (documentElement endOfStatement? | preIfElseBlock)+
    ;

methodDeclaration
	: methodSignature endOfStatement
        attributeStatement*
		block?
		methodClose endOfStatement
	;

expression
    : (ambiguousComponent | flowCharacter | keywordComponent) ws?
    ;

doBlockOpen
    : ws? DO (ws (WHILE | UNTIL) ws expression+)? endOfStatement
    ;

doBlockClose
    : ws? LOOP (ws (WHILE | UNTIL) ws expression+)? endOfStatement
    ;

// doBlock
//     : doBlockOpen
//         block?
//         doBlockClose
//     ;

onErrorResumeNextStatement
    : ws? ON ws ERROR ws RESUME ws NEXT endOfStatement
    ;

whileBlockOpen
    : ws? WHILE ws expression+ endOfStatement
    ;

whileBlockClose
    : ws? WEND endOfStatement
    ;

whileBlock
    : whileBlockOpen
        block?
        whileBlockClose
    ;

forBlockOpen
    : ws? FOR (ws EACH)? ws expression+ endOfStatement
    ;

forBlockClose
    : ws? NEXT (ws expression+)? endOfStatement
    ;

forBlock
    : forBlockOpen
        block?
        forBlockClose
    ;

ifBlockOpen
    : ws? IF ws expression+ THEN endOfStatement
    ;

elseIfBlockOpen
    : ws? ELSEIF ws expression+ THEN endOfStatement
    ;

ifBlockDefault
    : ws? ELSE endOfStatement
    ;

ifBlockClose
    : ws? END ws IF endOfStatement
    ;

ifElseBlock
    : ifBlockOpen block?
        (elseIfBlockOpen block?)*
        (ifBlockDefault block?)?
        ifBlockClose
    ;

preIfBlockOpen
    : ws? PREIF ws expression+ THEN endOfStatement
    ;

preElseIfBlockOpen
    : ws? PREELSEIF ws expression+ THEN endOfStatement
    ;

preIfBlockDefault
    : ws? PREELSE endOfStatement
    ;

preIfBlockClose
    : ws? PREEND ws IF endOfStatement
    ;

preIfElseBlock
    : preIfBlockOpen preBlock?
        (preElseIfBlockOpen preBlock?)*
        (preIfBlockDefault preBlock?)?
        preIfBlockClose
    ;

ifElseStatement
    : ws? IF ws expression+ THEN ws expression+ (ELSE ws expression+)? endOfStatement
    ;

selectCaseOpen
    : ws? SELECT ws CASE basicStatement
    ;

selectCaseClose
    : ws? END ws SELECT
    ;

caseStatement
    : ws? CASE (ws IS)? basicStatement?
    ;

caseDefaultStatement
    : ws? CASE ws ELSE endOfStatement
    ;

caseBlock
    : ((caseStatement | caseDefaultStatement) block)+
    ;

// selectCaseBlock
//     : selectCaseOpen
//         documentElement*
//         caseBlock?
//         selectCaseClose
//     ;

comment
	: ws? (COMMENT | REMCOMMENT)
	;

colonEnding
    : COLON ws? lineEnding?
    ;

lineEnding
    : (ws? NEWLINE)+
    | endOfFile
    ;

endOfStatement
    : comment? (colonEnding | lineEnding)
    ;

continuation
    : LINE_CONTINUATION
    ;

ambiguousComponent
    : ANYCHARS
    | STRINGLITERAL
    ;

keywordComponent
    : AS
    | ASSIGNMENT
    | BEGIN
    | DO
    | ERROR
    | FOR
    | FUNCTION
    | GLOBAL
    | IF
    | IS
    | NEXT
    | ON
    | PRIVATE
    | PROPERTY
    | PUBLIC
    | RESUME
    | SUB
    | THEN
    | TYPE
    ;

flowCharacter
    : LPAREN
    | RPAREN
    ;

ws
	: (TAB
	| SPACE
	| continuation)+
	;

// COMPUND LEXER RULES

REMCOMMENT
    : COLON? REM (TAB | SPACE) (LINE_CONTINUATION | ~[\r\n\u2028\u2029])*
    ;

COMMENT
    : SINGLEQUOTE (LINE_CONTINUATION | ~[\r\n\u2028\u2029])*
    ;


// LEXER RULES

ASSIGNMENT
    : ':='
    ;

STRINGLITERAL
    : '"' (~["\r\n] | '""')* '"'
    ;

LPAREN
    : '('
    ;

RPAREN
	: ')'
	;

COLON
    : ':'
    ;

AS
    : 'AS'
    ;

BEGIN
    : 'BEGIN'
    ;

ATTRIBUTE
	: 'ATTRIBUTE'
	;

DO
    : 'DO'
    ;

LOOP
    : 'LOOP'
    ;

FOR
    : 'FOR'
    ;

EACH
    : 'EACH'
    ;

NEXT
    : 'NEXT'
    ;

WHILE
    : 'WHILE'
    ;

UNTIL
    : 'UNTIL'
    ;

WEND
    : 'WEND'
    ;

ON
    : 'ON'
    ;

ERROR
    : 'ERROR'
    ;

RESUME
    : 'RESUME'
    ;

PREIF
	: '#IF'
	;

IF
	: 'IF'
	;

IS
    : 'IS'
    ;

PREELSE
	: '#ELSE'
	;

ELSE
	: 'ELSE'
	;

PREELSEIF
	: '#ELSEIF'
	;

ELSEIF
	: 'ELSEIF'
	;

THEN
	: 'THEN'
	;

PREEND
	: '#END'
	;

END
	: 'END'
	;

SELECT
    : 'SELECT'
    ;

CASE
    : 'CASE'
    ;

ENUM
    : 'ENUM'
    ;

FUNCTION
    : 'FUNCTION'
    ;

PROPERTY
    : 'PROPERTY'
    ;

GLOBAL
    : 'GLOBAL'
    ;

LINE_CONTINUATION
    : (TAB | SPACE) UNDERSCORE (TAB | SPACE)? '\r'? '\n'
    ;

PRIVATE
    : 'PRIVATE'
    ;

PUBLIC
    : 'PUBLIC'
    ;

REM
    : 'REM'
    ;

SINGLEQUOTE
    : '\''
    ;

SUB
    : 'SUB'
    ;

TYPE
    : 'TYPE'
    ;

UNDERSCORE
    : '_'
    ;

WITH
    : 'WITH'
    ;

TAB
	: '\t'+
	;

SPACE
    : [ \u3000]+
    ;

NEWLINE
	: [\r\n\u2028\u2029\u0019]+
	;

// Any non-whitespace or new line characters.
ANYCHARS
    : ANYCHAR+
    ;

fragment ANYCHAR
    : ~[\r\n\u2028\u2029 \t\u0019\u3000():]
    ;