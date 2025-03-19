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
    : ws? ((ambiguousComponent | keywordComponent | flowCharacter) ws?)+ endOfStatement
    ;

blankLine
    : ws? comment? NEWLINE
    ;

documentElement
	: comment
    | classHeader
    | doBlock
    | forBlock
    | endStatement
    | enumBlock
    | labelStatement
	| methodDeclaration
	| attributeStatement
    | ifElseStatement
    | ifElseBlock
    | selectCaseBlock
    | whileBlock
    | withBlock
    | basicStatement
    | blankLine
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

enumBlock
    : enumBlockOpen
        block?
        enumBlockClose
    ;

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

withBlock
    : ws? WITH ws expression endOfStatement
        block?
        ws? END ws WITH endOfStatement
    ;

block
    : documentElement+
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

doBlock
    : doBlockOpen
        block?
        doBlockClose
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
    : ws? forBlockOpen
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
    : ((caseStatement | caseDefaultStatement) block?)+
    ;

selectCaseBlock
    : selectCaseOpen
        caseBlock?
        selectCaseClose
    ;

comment
	: ws? (COMMENT | REMCOMMENT)
	;

colonEnding
    : COLON ws? NEWLINE?
    ;

lineEnding
    : ws? NEWLINE
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
    | BEGIN
    | DO
    | FOR
    | FUNCTION
    | GLOBAL
    | IF
    | IS
    | NEXT
    | PRIVATE
    | PROPERTY
    | PUBLIC
    | THEN
    | SUB
    | ASSIGNMENT
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

IF
	: 'IF'
	;

IS
    : 'IS'
    ;

ELSE
	: 'ELSE'
	;

ELSEIF
	: 'ELSEIF'
	;

THEN
	: 'THEN'
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