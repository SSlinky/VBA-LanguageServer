'  SYNTAX TEST "source.vba" "logic inline"

Attribute VB_Name = "Logic inline"

Sub Foo()

''''''''''''''''''''''''''''''''
' 1. Inline Ifs (without nesting)
''''''''''''''''''''''''''''''''

''''''''''''''''
' 1.1 Without Else
''''''''''''''''

'   Variable positive
    If condition Then MsgBox "foo"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^      meta.flow.inline-if.vba
'   ^^                                  keyword.control.flow.decision.vba
'                ^^^^                   keyword.control.flow.decision.vba

'   Variable negative
    If Not condition Then MsgBox "foo"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  meta.flow.inline-if.vba
'   ^^                                  keyword.control.flow.decision.vba
'      ^^^                              keyword.operator.logical.vba
'                    ^^^^               keyword.control.flow.decision.vba

'   Function positive
    If condition() Then MsgBox "foo"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    meta.flow.inline-if.vba
'   ^^                                  keyword.control.flow.decision.vba
'      ^^^^^^^^^^^                      meta.function.call.vba
'                  ^^^^                 keyword.control.flow.decision.vba

'   Function negative
    If Not condition() Then MsgBox "foo"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    meta.flow.inline-if.vba
'   ^^                                      keyword.control.flow.decision.vba
'      ^^^                                  keyword.operator.logical.vba
'          ^^^^^^^^^^^                      meta.function.call.vba
'                      ^^^^                 keyword.control.flow.decision.vba

'   Literal
    If Not True Then MsgBox "foo"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^       meta.flow.inline-if.vba
'   ^^                                  keyword.control.flow.decision.vba
'      ^^^                              keyword.operator.logical.vba
'          ^^^^                         constant.language.boolean.vba
'               ^^^^                    keyword.control.flow.decision.vba

'   Expression
    If Not condition = 5 Then MsgBox "foo"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^      meta.flow.inline-if.vba
'   ^^                                          keyword.control.flow.decision.vba
'      ^^^                                      keyword.operator.logical.vba
'                    ^                          keyword.operator.comparison.vba
'                      ^                        constant.numeric.vba
'                        ^^^^                   keyword.control.flow.decision.vba

''''''''''''''''
' 1.2 With Else
''''''''''''''''

'   Variable positive
    If condition Then MsgBox "foo" Else MsgBox "bar"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  meta.flow.inline-if-else.vba
'   ^^ 	                                              keyword.control.flow.decision.vba
'                ^^^^                                 keyword.control.flow.decision.vba
'                                  ^^^^               keyword.control.flow.decision.vba

'   Variable negative
    If Not condition Then MsgBox "foo" Else MsgBox "bar"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    meta.flow.inline-if-else.vba
'   ^^                                                      keyword.control.flow.decision.vba
'      ^^^                                                  keyword.operator.logical.vba
'                    ^^^^                                   keyword.control.flow.decision.vba
'                                      ^^^^                 keyword.control.flow.decision.vba

'   Function positive
    If condition() Then MsgBox "foo" Else MsgBox "bar"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^      meta.flow.inline-if-else.vba
'   ^^                                                      keyword.control.flow.decision.vba
'      ^^^^^^^^^^^                                          meta.function.call.vba
'                  ^^^^                                     keyword.control.flow.decision.vba
'                                    ^^^^                   keyword.control.flow.decision.vba

'   Function negative
    If Not condition() Then MsgBox "foo" Else MsgBox "bar"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^      meta.flow.inline-if-else.vba
'   ^^                                                          keyword.control.flow.decision.vba
'      ^^^                                                      keyword.operator.logical.vba
'          ^^^^^^^^^^^                                          meta.function.call.vba
'                      ^^^^                                     keyword.control.flow.decision.vba
'                                        ^^^^                   keyword.control.flow.decision.vba

'   Literal
    If Not True Then MsgBox "foo" Else MsgBox "bar"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^         meta.flow.inline-if-else.vba
'   ^^                                                      keyword.control.flow.decision.vba
'      ^^^                                                  keyword.operator.logical.vba
'          ^^^^                                             constant.language.boolean.vba
'               ^^^^                                        keyword.control.flow.decision.vba
'                                 ^^^^                      keyword.control.flow.decision.vba

'   Expression
    If Not condition = 5 Then MsgBox "foo" Else MsgBox "bar"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    meta.flow.inline-if-else.vba
'   ^^                                                          keyword.control.flow.decision.vba
'      ^^^                                                      keyword.operator.logical.vba
'                    ^                                          keyword.operator.comparison.vba
'                      ^                                        constant.numeric.vba
'                        ^^^^                                   keyword.control.flow.decision.vba
'                                          ^^^^                 keyword.control.flow.decision.vba

''''''''''''''''''''''''''''''''
' 2. Inline Ifs with nesting
''''''''''''''''''''''''''''''''

''''''''''''''''
' 2.1 Without Else
''''''''''''''''

'   Variable condition with repeated If
    If condition Then If condition Then MsgBox "foo"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        meta.flow.inline-if.vba
'   ^^                                                      keyword.control.flow.decision.vba
'                ^^^^                                       keyword.control.flow.decision.vba
'                     ^^                                    keyword.control.flow.decision.vba
'                                  ^^^^                     keyword.control.flow.decision.vba

''''''''''''''''
' 2.2 With Else
''''''''''''''''

'   Variable condition with repeated If and Else
    If condition Then If condition Then MsgBox "foo" Else MsgBox "bar"
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  meta.flow.inline-if-else.vba
'   ^^ 	                                                                keyword.control.flow.decision.vba
'                ^^^^                                                   keyword.control.flow.decision.vba
'                     ^^                                                keyword.control.flow.decision.vba
'                                  ^^^^                                 keyword.control.flow.decision.vba
'                                                    ^^^^               keyword.control.flow.decision.vba

End Sub
