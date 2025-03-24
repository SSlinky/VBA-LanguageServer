'  SYNTAX TEST "source.vba" "arguments"

Sub Foo()
'    Basic implicit sub call
    BarSub x, 10, True = False
'           ^^^^^^^^^^^^^^^^^^^    meta.arguments.vba
'           ^   ^                  punctuation.separator.vba
'                  ^^^^^^^^^^^^    meta.expression.vba

'    Basic explicit sub call
    Call BarSub(x, 10, True = False)
'               ^^^^^^^^^^^^^^^^^^^     meta.arguments.vba
'                ^   ^                  punctuation.separator.vba
'                      ^^^^^^^^^^^^     meta.expression.vba

'    Basic function call    
    result = BarFunc(x, 10, True = False)
'                    ^^^^^^^^^^^^^^^^^^^     meta.arguments.vba
'                     ^   ^                  punctuation.separator.vba
'                           ^^^^^^^^^^^^     meta.expression.vba

'   Named args sub call
    BarSub x, 10, NamedArgument:=True = False
'          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   meta.arguments.vba
'           ^   ^                               punctuation.separator.vba
'                                ^^^^^^^^^^^^   meta.expression.vba
'                 ^^^^^^^^^^^^^                 meta.arg-name.vba variable.parameter.name.vba
'                              ^^               meta.arg-name.vba punctuation.assignment.parameter.vba

'   Named function sub call
    result = BarFunc(x, 10, NamedArgument:=True = False)
'                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   meta.arguments.vba
'                     ^   ^                               punctuation.separator.vba
'                                          ^^^^^^^^^^^^   meta.expression.vba
'                           ^^^^^^^^^^^^^                 meta.arg-name.vba variable.parameter.name.vba
'                                        ^^               meta.arg-name.vba punctuation.assignment.parameter.vba


'   Sub call multi-line
    BarSub  _
'           ^                               meta.arguments.vba keyword.control.line-continuation.vba
        validationResult, _
'       ^^^^^^^^^^^^^^^^^^^                 meta.arguments.vba
'                       ^                   punctuation.separator.vba
'                         ^                 keyword.control.line-continuation.vba
        validationResult + 10, _
'       ^^^^^^^^^^^^^^^^^^^^^^^^            meta.arguments.vba
'       ^^^^^^^^^^^^^^^^^^^^^               meta.expression.vba
'                            ^              punctuation.separator.vba
'                              ^            keyword.control.line-continuation.vba
        NamedArgument:=validationResult
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     meta.arguments.vba
'       ^^^^^^^^^^^^^                       variable.parameter.name.vba
'                    ^^                     punctuation.assignment.parameter.vba

'   Function call multi-line
    result = BarSub( _
'                    ^                      meta.arguments.vba keyword.control.line-continuation.vba
        validationResult, _
'       ^^^^^^^^^^^^^^^^^^^                 meta.arguments.vba
'                       ^                   punctuation.separator.vba
'                         ^                 keyword.control.line-continuation.vba
        validationResult + 10, _
'       ^^^^^^^^^^^^^^^^^^^^^^^^            meta.arguments.vba
'       ^^^^^^^^^^^^^^^^^^^^^               meta.expression.vba
'                            ^              punctuation.separator.vba
'                              ^            keyword.control.line-continuation.vba
        NamedArgument:=validationResult)
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     meta.arguments.vba
'       ^^^^^^^^^^^^^                       variable.parameter.name.vba
'                    ^^                     punctuation.assignment.parameter.vba
'                                      ^    - meta.arguments.vba
End Sub