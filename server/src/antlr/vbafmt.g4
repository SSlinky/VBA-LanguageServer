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

basicStatement
    : ws (ambiguousComponent ws?)+ endOfStatement
    ;

// endOfStatement
//     : bols? NEWLINE
//     ;

documentElement
	: comment
	| methodDeclaration
	| attributeStatement
    | basicStatement
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

methodOpen
    : ws? (visibility ws)? (SUB | FUNCTION | (PROPERTY ws ANYCHARS)) ws ANYCHARS
    ;

methodParameters
    : LPAREN (ANYCHARS | AS | STRINGLITERAL | ws)* RPAREN asType? endOfStatement
    ;

methodClose
    : ws? END ws (SUB | FUNCTION | PROPERTY) endOfStatement
    ;

methodBody
    : documentElement*
    ;

methodDeclaration
	: methodOpen
		methodParameters
        attributeStatement?
		methodBody
		methodClose
	;

comment
	: ws? (COMMENT | REMCOMMENT) (ws | ANYCHARS)*
	;

endOfStatement
    : comment? (NEWLINE+ | endOfFile)
    ;

continuation
    : LINE_CONTINUATION
    ;

ambiguousComponent
    : ANYCHARS
    | STRINGLITERAL
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

ATTRIBUTE
	: 'ATTRIBUTE'
	;

END
	: 'END'
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
    : ~[\r\n\u2028\u2029 \t\u0019\u3000()]
    ;