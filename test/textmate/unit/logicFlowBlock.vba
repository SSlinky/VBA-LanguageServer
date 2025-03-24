'  SYNTAX TEST "source.vba" "logic flow"

Attribute VB_Name = "Logic"
' Copyright 2024 Sam Vanderslink
'
' Permission is hereby granted, free of charge, to any person obtaining a copy
' of this software and associated documentation files (the "Software"), to deal
' in the Software without restriction, including without limitation the rights
' to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
' copies of the Software, and to permit persons to whom the Software is
' furnished to do so, subject to the following conditions:
'
' The above copyright notice and this permission notice shall be included in
' all copies or substantial portions of the Software.
'
' THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
' IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
' FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
' AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
' LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
' FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
' IN THE SOFTWARE.

Option Explicit


Public Sub Foo()
'   Variable positive
    If condition Then
'   ^^^^^^^^^^^^^^^^^       meta.block-if-else.vba
'   ^^                      keyword.control.block-if.open.vba
'                ^^^^       keyword.control.block-if.open.vba
    Else If condition Then
'   ^^^^^^^^^^^^^^^^^       meta.block-if-else-if.vba
'   ^^^^ ^^                 keyword.control.block-if.open.vba
'                     ^^^^  keyword.control.block-if.open.vba
    End If
'   ^^^ ^^                  meta.block-if-else.vba keyword.control.block-if.close.vba

'   Variable negative
    If Not condition Then
'   ^^^^^^^^^^^^^^^^^^^^^       meta.block-if-else.vba
'   ^^                          keyword.control.block-if.open.vba
'      ^^^                      keyword.operator.logical.vba
'                    ^^^^       keyword.control.block-if.open.vba
    Else If Not condition Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^  meta.block-if-else-if.vba
'   ^^^^ ^^                     keyword.control.block-if.open.vba
'           ^^^                 keyword.operator.logical.vba
'                         ^^^^  keyword.control.block-if.open.vba
    End If
'   ^^^ ^^                      meta.block-if-else.vba keyword.control.block-if.close.vba

'   Function positive
    If condition() Then
'   ^^^^^^^^^^^^^^^^^^^         meta.block-if-else.vba
'   ^^                          keyword.control.block-if.open.vba
'      ^^^^^^^^^^^              meta.function.call.vba
'                  ^^^^         keyword.control.block-if.open.vba
    Else If condition() Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^    meta.block-if-else-if.vba
'   ^^^^ ^^             ^^^^    keyword.control.block-if.open.vba
'           ^^^^^^^^^^^         meta.function.call.vba
'                       ^^^^    keyword.control.block-if.open.vba
    End If
'   ^^^ ^^                      meta.block-if-else.vba keyword.control.block-if.close.vba

'   Function negative
    If Not condition() Then
'   ^^^^^^^^^^^^^^^^^^^^^^^         meta.block-if-else.vba
'   ^^                 ^^^^         keyword.control.block-if.open.vba
'      ^^^                          keyword.operator.logical.vba
'          ^^^^^^^^^^^              meta.function.call.vba
    Else If Not condition() Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^    meta.block-if-else-if.vba
'   ^^^^ ^^                 ^^^^    keyword.control.block-if.open.vba
'           ^^^                     keyword.operator.logical.vba
'               ^^^^^^^^^^^         meta.function.call.vba
    End If
'   ^^^ ^^                          meta.block-if-else.vba keyword.control.block-if.close.vba

'   Literal
    If Not True Then
'   ^^^^^^^^^^^^^^^^        meta.block-if-else.vba
'   ^^          ^^^^        keyword.control.block-if.open.vba
'      ^^^                  keyword.operator.logical.vba
'          ^^^^             constant.language.boolean.vba
    Else If Not False Then
'   ^^^^^^^^^^^^^^^^^^^^^^  meta.block-if-else-if.vba
'   ^^^^ ^^           ^^^^  keyword.control.block-if.open.vba
'           ^^^             keyword.operator.logical.vba
'               ^^^^^       constant.language.boolean.vba

    End If
'   ^^^ ^^                  meta.block-if-else.vba keyword.control.block-if.close.vba

'   Expression
    If Not condition = 5 Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^                               meta.block-if-else.vba
'   ^^                   ^^^^                               keyword.control.block-if.open.vba
'      ^^^                                                  keyword.operator.logical.vba
'                    ^                                      keyword.operator.comparison.vba
'                      ^                                    constant.numeric.vba
    Else If Not GetValue(x) = GetOtherValue("foo") Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     meta.block-if-else-if.vba
'   ^^^^ ^^                                        ^^^^     keyword.control.block-if.open.vba
'           ^^^                                             keyword.operator.logical.vba
'               ^^^^^^^^^^^                                 meta.function.call.vba
'                           ^                               keyword.operator.comparison.vba
'                             ^^^^^^^^^^^^^^^^^^^^          meta.function.call.vba
    End If
'   ^^^ ^^                                                  meta.block-if-else.vba keyword.control.block-if.close.vba

    Select Case True
'   ^^^^^^ ^^^^             meta.flow.switch.vba keyword.control.flow.switch.vba
'               ^^^^        meta.flow.switch.vba meta.expression.vba
100:
        Case Is = x = y:
'       ^^^^                keyword.control.flow.switch.vba
'            ^^^^^^^^^^     meta.flow.switch.vba meta.expression.vba
'                      ^    keyword.control.line-separator.vba
            Foo
'           ^^^             meta.sub-call.vba
        Case Else:
'       ^^^^ ^^^^           keyword.control.flow.switch.vba
'                ^          keyword.control.line-separator.vba
            GoTo 100
'           ^^^^            keyword.control.jump.vba
'                ^^^        constant.numeric.vba
    End Select
'   ^^^ ^^^^^^              meta.flow.switch.vba keyword.control.flow.switch.vba

    NotSwitch
'   ^^^^^^^^^               - meta.flow.switch.vba

    On Error GoTo Foo
'   ^^^^^^^^ ^^^^^^^^   meta.onErrorStatement.vba
'   ^^ ^^^^^ ^^^^       keyword.control.flow.jump.vba
'   ^^^^^^^^ ^^^^       keyword.control.flow.jump.vba
'                 ^^^   variable.other.constant.label.vba

    On Error GoTo 0
'   ^^^^^^^^ ^^^^^^     meta.onErrorStatement.vba
'   ^^ ^^^^^ ^^^^       keyword.control.flow.jump.vba
'                 ^     constant.numeric.vba

    On Error Resume Next
'   ^^^^^^^^ ^^^^^^^^^^^   meta.onErrorStatement.vba keyword.control.flow.jump.vba

    On foo + 1 GoTo foo, bar, 100
'   ^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^   meta.onExpressionGoStatement.vba
'   ^^         ^^^^                 keyword.control.flow.jump.vba
'      ^^^^^^^                      meta.expression.vba
'                   ^^^^^^^^^^^^^   meta.onExpressionGoStatement.vba
'                   ^^^  ^^^        variable.other.constant.label.vba
'                      ^    ^       punctuation.separator.vba
'                             ^^^   constant.numeric.vba

    On foo() GoSub foo, bar, 100
'   ^^^^^^^^ ^^^^^^^^^^^^^^^^^^^    meta.onExpressionGoStatement.vba
'   ^^       ^^^^^                  keyword.control.flow.jump.vba
'      ^^^^^                        meta.expression.vba
'                  ^^^^^^^^^^^^^    meta.onExpressionGoStatement.vba
'                  ^^^  ^^^         variable.other.constant.label.vba
'                     ^    ^        punctuation.separator.vba
'                            ^^^    constant.numeric.vba

    GoTo 100
'   ^^^^^^^^    meta.goToGoSubReturnStatement.vba
'   ^^^^        keyword.control.jump.vba
'        ^^^    constant.numeric.vba

    GoTo Foo
'   ^^^^^^^^    meta.goToGoSubReturnStatement.vba
'   ^^^^        keyword.control.jump.vba
'        ^^^    variable.other.constant.label.vba

    GoSub 100
'   ^^^^^^^^^   meta.goToGoSubReturnStatement.vba
'   ^^^^^       keyword.control.jump.vba
'         ^^^   constant.numeric.vba

    GoSub Foo
'   ^^^^^^^^^   meta.goToGoSubReturnStatement.vba
'   ^^^^^       keyword.control.jump.vba
'         ^^^   variable.other.constant.label.vba

    Return
'   ^^^^^^  meta.goToGoSubReturnStatement.vba keyword.control.jump.vba

'   Inline If
    If cond Then Foo
'   ^^^^^^^^^^^^^^^^        meta.flow.inline-if.vba
'   ^^      ^^^^            keyword.control.flow.decision.vba
'                ^^^        entity.name.function.call.vba
    If cond Then foo = BAR
'   ^^^^^^^^^^^^^^^^^^^^^^  meta.flow.inline-if.vba
'   ^^      ^^^^            keyword.control.flow.decision.vba
'                ^^^^^^^^^  meta.variable-assignment.vba
    If cond Then GoTo 100
'   ^^^^^^^^^^^^^^^^^^^^^   meta.flow.inline-if.vba
'   ^^      ^^^^            keyword.control.flow.decision.vba
'                ^^^^^^^^   meta.goToGoSubReturnStatement.vba
    If cond Then GoSub Foo
'   ^^^^^^^^^^^^^^^^^^^^^^  meta.flow.inline-if.vba
'   ^^      ^^^^            keyword.control.flow.decision.vba
'                ^^^^^^^^^  meta.goToGoSubReturnStatement.vba

    If cond Then Foo Else Foo
'   ^^^^^^^^^^^^^^^^^^^^^^^^^               meta.flow.inline-if-else.vba
'   ^^      ^^^^     ^^^^                   keyword.control.flow.decision.vba
'                ^^^      ^^^               entity.name.function.call.vba
    If cond Then foo = BAR Else foo = BAR
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   meta.flow.inline-if-else.vba
'   ^^      ^^^^           ^^^^             keyword.control.flow.decision.vba
'                ^^^^^^^^^      ^^^^^^^^^   meta.variable-assignment.vba
    If cond Then GoTo 100 Else GoTo 100
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     meta.flow.inline-if-else.vba
'   ^^      ^^^^          ^^^^              keyword.control.flow.decision.vba
'                ^^^^^^^^      ^^^^^^^^     meta.goToGoSubReturnStatement.vba
    If cond Then GoSub Foo Else GoSub Foo
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   meta.flow.inline-if-else.vba
'   ^^      ^^^^           ^^^^             keyword.control.flow.decision.vba
'                ^^^^^^^^^      ^^^^^^^^^   meta.goToGoSubReturnStatement.vba

'   If blocks
    If foo Then
'   ^^     ^^^^                     meta.block-if-else.vba keyword.control.block-if.open.vba
'      ^^^                          meta.block-if-else.vba meta.expression.vba
        bar = 5
'       ^^^^^^^                     meta.block-if-else.vba meta.variable-assignment.vba
    Else If Not foo = ACONST Then
'   ^^^^ ^^                  ^^^^   meta.block-if-else.vba keyword.control.block-if.open.vba
'           ^^^^^^^^^^^^^^^^        meta.block-if-else.vba meta.expression.vba
        bar = 3
'       ^^^^^^^                     meta.block-if-else.vba meta.variable-assignment.vba
    Else
'   ^^^^                            keyword.control.block-if.else.vba
        bar = 0
'       ^^^^^^^                     meta.block-if-else.vba meta.variable-assignment.vba
    End If
'   ^^^ ^^                          meta.block-if-else.vba keyword.control.block-if.close.vba

    If foo Then
'   ^^     ^^^^                     meta.block-if-else.vba keyword.control.block-if.open.vba
'      ^^^                          meta.block-if-else.vba meta.expression.vba
        bar = 5
'       ^^^^^^^                     meta.block-if-else.vba meta.variable-assignment.vba
    Else If Not foo = ACONST Then
'   ^^^^ ^^                  ^^^^   meta.block-if-else.vba keyword.control.block-if.open.vba
'           ^^^^^^^^^^^^^^^^        meta.block-if-else.vba meta.expression.vba
        bar = 3
'       ^^^^^^^                     meta.block-if-else.vba meta.variable-assignment.vba
    Else
'   ^^^^                            keyword.control.block-if.else.vba
        bar = 0
'       ^^^^^^^                     meta.block-if-else.vba meta.variable-assignment.vba
    End If
'   ^^^ ^^                          meta.block-if-else.vba keyword.control.block-if.close.vba

'   Nesting tests
    If foo Then
'   ^^     ^^^^             meta.block-if-else.vba keyword.control.block-if.open.vba
'      ^^^^^^^^             meta.block-if-else.vba meta.block-if.condition.vba
        If foo Then
'       ^^     ^^^^         meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'          ^^^^^^^^         meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            If foo Then
'           ^^     ^^^^     meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'              ^^^^^^^^     meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            End If
'           ^^^ ^^          meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
        Else If foo Then
'       ^^^^ ^^     ^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else-if.vba keyword.control.block-if.open.vba
'               ^^^^^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else-if.vba meta.block-if.condition.vba
            If foo Then
'           ^^     ^^^^     meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'              ^^^^^^^^     meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            End If
'           ^^^ ^^          meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
        Else
'       ^^^^                keyword.control.block-if.else.vba
            If foo Then
'           ^^     ^^^^     meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'              ^^^^^^^^     meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            End If
'           ^^^ ^^          meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
        End If
'       ^^^ ^^              meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
    End If
'   ^^^ ^^                  meta.block-if-else.vba keyword.control.block-if.close.vba

'< source.vba - meta.block-if-else.vba keyword.control.block-if.close.vba

'   Compiler if blocks
    #If foo Then
'   ^^^     ^^^^            meta.block-if-else.vba keyword.control.block-if.open.vba
'       ^^^^^^^^            meta.block-if-else.vba meta.block-if.condition.vba
        #If foo Then
'       ^^^     ^^^^        meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'           ^^^^^^^^        meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            #If foo Then
'           ^^^     ^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'               ^^^^^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            #End If
'           ^^^^ ^^         meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
        #Else If foo Then
'       ^^^^^ ^^     ^^^^   meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else-if.vba keyword.control.block-if.open.vba
'                ^^^^^^^^   meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else-if.vba meta.block-if.condition.vba
            #If foo Then
'           ^^^     ^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'               ^^^^^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            #End If
'           ^^^^ ^^         meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
        #Else
'       ^^^^^               keyword.control.block-if.else.vba
            #If foo Then
'           ^^^     ^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'               ^^^^^^^^    meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba meta.block-if.condition.vba
            #End If
'           ^^^^ ^^         meta.block-if-else.vba meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
        #End If
'       ^^^^ ^^             meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
    #End If
'   ^^^^ ^^                 meta.block-if-else.vba keyword.control.block-if.close.vba

'   Line continuation stress test.
    If _
'   ^^              meta.block-if-else.vba keyword.control.block-if.open.vba
'      ^            meta.block-if-else.vba keyword.control.line-continuation.vba
    True _
'   ^^^^^^          meta.block-if-else.vba meta.expression.vba
    Then
'   ^^^^            meta.block-if-else.vba keyword.control.block-if.open.vba
    If _
'   ^^              meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
'      ^            meta.block-if-else.vba meta.block-if-else.vba keyword.control.line-continuation.vba
    True _
'   ^^^^^^          meta.block-if-else.vba meta.block-if-else.vba meta.expression.vba
    Then
'   ^^^^            meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.open.vba
    Else
'   ^^^^            meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.else.vba
    End If
'   ^^^ ^^          meta.block-if-else.vba meta.block-if-else.vba keyword.control.block-if.close.vba
    Debug.Print 5
'<                  meta.block-if-else.vba - meta.block-if-else.vba
    End _
'   ^^^             meta.block-if-else.vba keyword.control.block-if.close.vba
'       ^           meta.block-if-else.vba keyword.control.line-continuation.vba
    If
'   ^^              meta.block-if-else.vba keyword.control.block-if.close.vba

End Sub
