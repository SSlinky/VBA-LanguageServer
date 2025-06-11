grammar vbapre;

options {
    caseInsensitive = true;
}

// PARSER RULES
startRule
    : document EOF
    // : anyOtherLine EOF
    ;

document
    : (documentLines | compilerIfBlock | constDirectiveStatement)*
    ;

documentLines
    : (anyOtherLine | endOfLine)+
    ;

constDirectiveName
    : ANYCHARS
    ;

directiveParenthesizedExpression
    : '(' WS? directiveExpression WS? ')'
    ;

directiveUnaryMinusExpression
    : '-' WS? directiveExpression
    ;

directiveLiteralExpression
    : DATELITERAL
    | FLOATLITERAL
    | INTEGERLITERAL
    | STRINGLITERAL
    | literalIdentifier
    ;

literalIdentifier
    : booleanLiteralIdentifier
    | objectLiteralIdentifier
    | variantLiteralIdentifier
    ;

booleanLiteralIdentifier
    : TRUE
    | FALSE
    ;

objectLiteralIdentifier
    : NOTHING
    ;

variantLiteralIdentifier
    : EMPTY_X
    | NULL_
    ;

directiveExpression
    : directiveLiteralExpression
    | directiveParenthesizedExpression
    | directiveUnaryMinusExpression
    // | directiveExpression wsc? (divOperator | multOperator) wsc? directiveExpression
    // | directiveExpression wsc? modOperator wsc? directiveExpression
    // | directiveExpression wsc? (plusOperator | minusOperator) wsc? directiveExpression
    // | directiveExpression wsc? ampOperator wsc? directiveExpression
    // | directiveExpression wsc? (
    //     IS
    //     | LIKE
    //     | geqOperator
    //     | leqOperator
    //     | gtOperator
    //     | ltOperator
    //     | neqOperator
    //     | eqOperator
    // ) wsc? directiveExpression
    // | notOperatorExpression
    // | directiveExpression wsc? (andOperator | orOperator | xorOperator | eqvOperator | impOperator) wsc? directiveExpression
    // | lExpression
    ;

constDirectiveStatement
    : CONST WS constDirectiveName WS? EQ WS? directiveExpression endOfStatement
    ;

compilerIfBlock
    : compilerConditionalBlock+
        compilerDefaultBlock?
        compilerEndIfStatement
    ;

compilerConditionalBlock
    : compilerConditionalStatement compilerBlockContent?
    ;

compilerDefaultBlock
    : compilerElseStatement compilerBlockContent?
    ;
    
compilerConditionalStatement
    : compilerIfStatement
    | compilerElseIfStatement
    ;

compilerIfStatement
    : WS? IF WS? booleanExpression WS? THEN endOfStatement
    ;

compilerElseIfStatement
    : WS? ELSEIF WS? booleanExpression WS? THEN endOfStatement
    ;

compilerElseStatement
    : WS? ELSE endOfStatement
    ;

compilerEndIfStatement
    : WS? ENDIF endOfStatement?
    ;

compilerBlockContent
    : (anyOtherLine | endOfLine | compilerIfBlock)+
    ;

// *************************

booleanExpression
    : booleanPart+
    ;

booleanPart
    : WS? (AND | OR | XOR | EQV | IMP)? WS? NOT? WS? (compilerConstant | anyWord)
    ;

compilerConstant
    : VBA6
    | VBA7
    | WIN16
    | WIN32
    | WIN64
    | MAC
    ;

anyWord: (
		ANYCHARS
		| EQ
		| STRINGLITERAL
		| FLOATLITERAL
		| DATELITERAL
		| TRUE
		| FALSE
		| NOTHING
		| EMPTY_X
		| NULL_
	)+;

anyOtherLine
    : (WS* anyWord)+
    ;

endOfLine
    : (WS* (NEWLINE | commentBody | remStatement))+
    ;

endOfLineNoWs
    : (NEWLINE | commentBody | remStatement)
    ;

endOfStatement
    : (endOfLine | WS? COLON WS? )+
    ;

commentBody: COMMENT;
remStatement: REMCOMMENT;

// wsc: (WS | LINE_CONTINUATION)+;




// LEXER RULES

NEWLINE
    // Match at least one new line but then any number
    // of blank lines, including white space.
    : ([\r\n\u2028\u2029]) (WS* ([\r\n\u2028\u2029]))*
    ;

AS
    : 'AS'
    ;

CONST
    : '#CONST'
    ;

ELSE
    : '#ELSE'
    ;

ELSEIF
    : '#ELSEIF'
    ;

ENDIF
    : '#END IF'
    ;

IF
    : '#IF'
    ;

THEN
    : 'THEN'
    ;

VBA6
    : 'VBA6'
    ;
    
VBA7
    : 'VBA7'
    ;
    
WIN16
    : 'WIN16'
    ;
    
WIN32
    : 'WIN32'
    ;
    
WIN64
    : 'WIN64'
    ;
    
MAC
    : 'MAC'
    ;

REMCOMMENT
    : COLON? REM WS (LINE_CONTINUATION | ~[\r\n\u2028\u2029])*
    ;

COMMENT
    : SINGLEQUOTE (LINE_CONTINUATION | ~[\r\n\u2028\u2029])*
    ;

LINE_CONTINUATION
    : WS UNDERSCORE WS? '\r'? '\n' -> channel(HIDDEN)
    ;

WS
    : NBSP+
    ;

fragment NBSP
    : [ \t\u0019\u3000]
    ;

fragment UNDERSCORE
    : '_'
    ;

COLON
    : ':'
    ;

SINGLEQUOTE
    : '\''
    ;

EQ
    : '='
    ;

REM
    : 'REM'
    ;

EQV
    : 'EQV'
    ;

IMP
    : 'IMP'
    ;

AND
    : 'AND'
    ;

OR
    : 'OR'
    ;

XOR
    : 'XOR'
    ;

NOT
    : 'NOT'
    ;

NOTHING
    : 'NOTHING'
    ;

NULL_
    : 'NULL'
    ;

TRUE
    : 'TRUE'
    ;

FALSE
    : 'FALSE'
    ;

EMPTY_X
    : 'EMPTY'
    ;

STRINGLITERAL
    : '"' (~["\r\n] | '""')* '"'
    ;

INTEGERLITERAL
    : (DIGIT DIGIT* | '&H' [0-9A-F]+ | '&' [O]? [0-7]+) [%&^]?
    ;

FLOATLITERAL
    : FLOATINGPOINTLITERAL [!#@]?
    | DECIMALLITERAL [!#@]
    ;

fragment FLOATINGPOINTLITERAL
    : DECIMALLITERAL [DE] [+-]? DECIMALLITERAL
    | DECIMALLITERAL '.' DECIMALLITERAL? ([DE] [+-]? DECIMALLITERAL)?
    | '.' DECIMALLITERAL ([DE] [+-]? DECIMALLITERAL)?
    ;

fragment DECIMALLITERAL
    : DIGIT DIGIT*
    ;

DATELITERAL
    : '#' DATEORTIME '#'
    ;

fragment DATEORTIME
    : DATEVALUE WS+ TIMEVALUE
    | DATEVALUE
    | TIMEVALUE
    ;

fragment DATEVALUE
    : DATEVALUEPART DATESEPARATOR DATEVALUEPART (DATESEPARATOR DATEVALUEPART)?
    ;

fragment DATEVALUEPART
    : DIGIT+
    | MONTHNAME
    ;

fragment DATESEPARATOR
    : WS+
    | WS? [/,-] WS?
    ;

fragment MONTHNAME
    : ENGLISHMONTHNAME
    | ENGLISHMONTHABBREVIATION
    ;

fragment ENGLISHMONTHNAME
    : 'JANUARY'
    | 'FEBRUARY'
    | 'MARCH'
    | 'APRIL'
    | 'MAY'
    | 'JUNE'
    | 'JULY'
    | 'AUGUST'
    | 'SEPTEMBER'
    | 'OCTOBER'
    | 'NOVEMBER'
    | 'DECEMBER'
    ;

// May has intentionally been left out
fragment ENGLISHMONTHABBREVIATION
    : 'JAN'
    | 'FEB'
    | 'MAR'
    | 'APR'
    | 'JUN'
    | 'JUL'
    | 'AUG'
    | 'SEP'
    | 'OCT'
    | 'NOV'
    | 'DEC'
    ;

fragment TIMEVALUE
    : DIGIT+ AMPM
    | DIGIT+ TIMESEPARATOR DIGIT+ (TIMESEPARATOR DIGIT+)? AMPM?
    ;

fragment TIMESEPARATOR
    : WS? (':' | '.') WS?
    ;

fragment AMPM
    : WS? ('AM' | 'PM' | 'A' | 'P')
    ;


// Any non-whitespace or new line characters.
ANYCHARS
    : ANYCHAR+
    ;

fragment ANYCHAR
    : ~[\r\n\u2028\u2029 \t\u0019\u3000]
    ;

fragment DIGIT
    : [0-9]
    ;