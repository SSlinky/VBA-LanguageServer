grammar vbapre;

options {
    caseInsensitive = true;
}

// PARSER RULES
startRule
    : document EOF
    ;

document
    : documentLine*
    ;

documentLine
	: compilerIfBlock
	| anyOtherLine
	| endOfLine
	;

compilerIfBlock
    : compilerIfStatement anyOtherLine*
        (compilerElseIfStatement anyOtherLine*)?
        (compilerElseStatement anyOtherLine*)?
        compilerEndIfStatement
    ;

compilerIfStatement
    : IF booleanExpression THEN endOfStatement
    ;

compilerElseIfStatement
    : ELSEIF booleanExpression THEN endOfStatement
    ;

compilerElseStatement
    : ELSE endOfStatement
    ;

compilerEndIfStatement
    : ENDIF endOfStatement
    ;

// *************************

booleanExpression
    : NOT? compilerConstant ((AND | OR | XOR | EQV | IMP | NOT)+ compilerConstant)*
    ;

compilerConstant
    : VBA6
    | VBA7
    | WIN16
    | WIN32
    | WIN64
    | MAC
    ;

anyWord
    : ANYCHARS
    ;

anyOtherLine
    : anyWord+ endOfLine?
    ;

endOfLine
    : (NEWLINE | commentBody | remStatement)
    ;

endOfLineNoWs
    : (NEWLINE | commentBody | remStatement)
    ;

endOfStatement
    : (endOfLine | COLON)+
    ;

commentBody: COMMENT;
remStatement: REMCOMMENT;

// wsc: (WS | LINE_CONTINUATION)+;




// LEXER RULES

NEWLINE
    : ([\r\n\u2028\u2029] WS?)+
    ;

ELSE
    : '#ELSE'
    ;

ELSEIF
    : '#ELSE IF'
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
    : ([ \t\u0019\u3000])+ -> channel(HIDDEN)
    ;

UNDERSCORE
    : '_'
    ;

COLON
    : ':'
    ;

SINGLEQUOTE
    : '\''
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


// Any non-whitespace or new line characters.
ANYCHARS
    : ([^ \t\u0019\u3000\r\n\u2028\u2029])+
    ;