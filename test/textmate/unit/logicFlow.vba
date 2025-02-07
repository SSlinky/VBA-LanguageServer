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
'   ^^^^^^^^^^^^^^^^^       meta.flow.block-if-else.vba
'   ^^                      keyword.control.flow.block-decision.vba
'                ^^^^       keyword.control.flow.block-decision.vba
    Else If condition Then
'   ^^^^^^^^^^^^^^^^^       meta.flow.block-if-else.vba
'   ^^^^^^^                 keyword.control.flow.block-decision.vba
'                     ^^^^  keyword.control.flow.block-decision.vba
    End If
'   ^^^^^^                  meta.flow.block-if-else.vba
'   ^^^^^^                  keyword.control.flow.block-decision.vba

'   Variable negative    
    If Not condition Then
'   ^^^^^^^^^^^^^^^^^^^^^       meta.flow.block-if-else.vba
'   ^^                          keyword.control.flow.block-decision.vba
'      ^^^                      keyword.operator.logical.vba
'                    ^^^^       keyword.control.flow.block-decision.vba
    Else If Not condition Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^  meta.flow.block-if-else.vba
'   ^^^^^^^                     keyword.control.flow.block-decision.vba
'           ^^^                 keyword.operator.logical.vba
'                         ^^^^  keyword.control.flow.block-decision.vba
    End If
'   ^^^^^^                      meta.flow.block-if-else.vba
'   ^^^^^^                      keyword.control.flow.block-decision.vba

'   Function positive
    If condition() Then
'   ^^^^^^^^^^^^^^^^^^^         meta.flow.block-if-else.vba
'   ^^                          keyword.control.flow.block-decision.vba
'      ^^^^^^^^^^^              meta.function.call.vba
'                  ^^^^         keyword.control.flow.block-decision.vba
    Else If condition() Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^    meta.flow.block-if-else.vba
'   ^^^^^^^                     keyword.control.flow.block-decision.vba
'           ^^^^^^^^^^^         meta.function.call.vba
'                       ^^^^    keyword.control.flow.block-decision.vba
    End If
'   ^^^^^^                      meta.flow.block-if-else.vba
'   ^^^^^^                      keyword.control.flow.block-decision.vba

'   Function negative
    If Not condition() Then
'   ^^^^^^^^^^^^^^^^^^^^^^^         meta.flow.block-if-else.vba
'   ^^                              keyword.control.flow.block-decision.vba
'      ^^^                          keyword.operator.logical.vba
'          ^^^^^^^^^^^              meta.function.call.vba
'                      ^^^^         keyword.control.flow.block-decision.vba
    Else If Not condition() Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^    meta.flow.block-if-else.vba
'   ^^^^^^^                         keyword.control.flow.block-decision.vba
'           ^^^                     keyword.operator.logical.vba
'               ^^^^^^^^^^^         meta.function.call.vba
'                           ^^^^    keyword.control.flow.block-decision.vba
    End If
'   ^^^^^^                          meta.flow.block-if-else.vba
'   ^^^^^^                          keyword.control.flow.block-decision.vba

'   Literal
    If Not True Then
'   ^^^^^^^^^^^^^^^^        meta.flow.block-if-else.vba
'   ^^                      keyword.control.flow.block-decision.vba
'      ^^^                  keyword.operator.logical.vba
'          ^^^^             constant.language.boolean.vba
'               ^^^^        keyword.control.flow.block-decision.vba
    Else If Not False Then
'   ^^^^^^^^^^^^^^^^^^^^^^  meta.flow.block-if-else.vba
'   ^^^^^^^                 keyword.control.flow.block-decision.vba
'           ^^^             keyword.operator.logical.vba
'               ^^^^^       constant.language.boolean.vba
'                     ^^^^  keyword.control.flow.block-decision.vba

    End If
'   ^^^^^^                  meta.flow.block-if-else.vba
'   ^^^^^^                  keyword.control.flow.block-decision.vba

'   Expression
    If Not condition = 5 Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^                               meta.flow.block-if-else.vba
'   ^^                                                      keyword.control.flow.block-decision.vba
'      ^^^                                                  keyword.operator.logical.vba
'                    ^                                      keyword.operator.comparison.vba
'                      ^                                    constant.numeric.vba
'                        ^^^^                               keyword.control.flow.block-decision.vba
    Else If Not GetValue(x) = GetOtherValue("foo") Then
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     meta.flow.block-if-else.vba
'   ^^^^^^^                                                 keyword.control.flow.block-decision.vba
'           ^^^                                             keyword.operator.logical.vba
'               ^^^^^^^^^^^                                 meta.function.call.vba
'                           ^                               keyword.operator.comparison.vba
'                             ^^^^^^^^^^^^^^^^^^^^          meta.function.call.vba
'                                                  ^^^^     keyword.control.flow.block-decision.vba
    End If
'   ^^^^^^                                                  meta.flow.block-if-else.vba
'   ^^^^^^                                                  keyword.control.flow.block-decision.vba
End Sub