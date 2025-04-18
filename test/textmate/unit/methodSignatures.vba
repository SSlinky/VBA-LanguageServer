'  SYNTAX TEST "source.vba" "method signatures"

' Inline sub
Sub Foo(): Debug.Print "Hello, World!": End Sub
'<--------                                      source.method.signature.vba
' <---                                          storage.type.method.vba
'   ^^^                                         entity.name.function.vba
'                                       ^^^^^^^ storage.type.method.close.vba

' Standard sub
Public Sub Foo(ByVal x As Long, ByRef underscore_param As Long, ParamArray vars() As Variant)
' <---------------------------------------------------------------------------------------------    source.method.signature.vba
' <----------                                                                                       storage.type.method.vba
'          ^^^                                                                                      entity.name.function.vba
'              ^^^^^                                                                                storage.modifier.ByVal.vba
'                    ^                                                                              variable.parameter.vba
'                      ^^                                                                           keyword.control.as.vba
'                         ^^^^                                                                      support.type.primitive.Long.vba
'                             ^                                                                     punctuation.separator.vba
'                               ^^^^^                                                               storage.modifier.ByRef.vba
'                                     ^^^^^^^^^^^^^^^^                                              variable.parameter.vba
'                                                      ^^                                           keyword.control.as.vba
'                                                         ^^^^                                      support.type.primitive.Long.vba
'                                                             ^                                     punctuation.separator.vba
'                                                               ^^^^^^^^^^                          storage.type.modifier.vba
'                                                                          ^^^^                     variable.parameter.vba
'                                                                                 ^^                keyword.control.as.vba
'                                                                                    ^^^^^^^        support.type.primitive.Variant.vba
End Sub


' Inline Function
Function Foo() As String: Foo = "Hello, World!": End Function
' <--------------                                               source.method.signature.vba
' <--------                                                     storage.type.method.vba
'        ^^^                                                    entity.name.function.vba
'              ^^                                               keyword.control.as.vba
'                 ^^^^^^                                        support.type.primitive.String.vba
'                                                ^^^^^^^^^^^^   storage.type.method.close.vba

' Standard function
Public Function Foo(ByVal x As Long, ByRef underscore_param As Long, ParamArray vars() As Variant) As Object
' <-----------------------------------------^^^^^^^^^^^^^^^----------------------------------------------------     source.method.signature.vba
' <---------------                                                                                                  storage.type.method.vba
'               ^^^                                                                                                 entity.name.function.vba
'                   ^^^^^                                                                                           storage.modifier.ByVal.vba
'                         ^                                                                                         variable.parameter.vba
'                           ^^                                                                                      keyword.control.as.vba
'                              ^^^^                                                                                 support.type.primitive.Long.vba
'                                  ^                                                                                punctuation.separator.vba
'                                    ^^^^^                                                                          storage.modifier.ByRef.vba
'                                          ^^^^^^^^^^^^^^^^                                                         variable.parameter.vba
'                                                           ^^                                                      keyword.control.as.vba
'                                                              ^^^^                                                 support.type.primitive.Long.vba
'                                                                  ^                                                punctuation.separator.vba
'                                                                    ^^^^^^^^^^                                     storage.type.modifier.vba
'                                                                               ^^^^                                variable.parameter.vba
'                                                                                      ^^                           keyword.control.as.vba
'                                                                                         ^^^^^^^                   support.type.primitive.Variant.vba
'                                                                                                  ^^               keyword.control.as.vba
'                                                                                                     ^^^^^^        support.type.object.Object.vba
End Function
'<-------------                                                                                     storage.type.method.close.vba

' Multi-Line Sub
Public Sub Foo(Optional Bar As String, _
' <----------                                   storage.type.method.vba
'          ^^^                                  entity.name.function.vba
'              ^^^^^^^^                         storage.type.modifier.vba
'                       ^^^                     variable.parameter.vba
'                           ^^                  keyword.control.as.vba
'                              ^^^^^^           support.type.primitive.String.vba
'                                    ^          punctuation.separator.vba
'                                      ^        keyword.control.line-continuation.vba
        Optional Biz As String = "Biz", _
'       ^^^^^^^^                                storage.type.modifier.vba
'                ^^^                            variable.parameter.vba
'                    ^^                         keyword.control.as.vba
'                       ^^^^^^                  support.type.primitive.String.vba
'                              ^                keyword.operator.assignment.vba
'                                ^^^^^          string.quoted.double.vba
'                                     ^         punctuation.separator.vba
'                                       ^       keyword.control.line-continuation.vba
        Optional ByVal Zip As Boolean = True)
'       ^^^^^^^^                                storage.type.modifier.vba
'                ^^^^^                          storage.modifier.ByVal.vba
'                      ^^^                      variable.parameter.vba
'                          ^^                   keyword.control.as.vba
'                             ^^^^^^^           support.type.primitive.Boolean.vba
'                                     ^         keyword.operator.assignment.vba
'                                       ^^^^    constant.language.boolean.vba
End Sub
'<--------                                      storage.type.method.close.vba

' Crazy sub - due to limitations with textMate, it does not seem possible to format
' types when using line continuations. This is because matches work on a single line,
' and it appears begin/end matches operate process "patterns" line-by-line too. An inner
' begin/end rule will only be given a line at a time to process.
Public Sub Foo( _
' <----------                                   storage.type.method.vba
'          ^^^                                  entity.name.function.vba
'               ^                               keyword.control.line-continuation.vba
    Optional baz As String _
'   ^^^^^^^^                                    storage.type.modifier.vba
'            ^^^                                variable.parameter.vba
'                ^^                             keyword.control.as.vba
'                   ^^^^^^                      support.type.primitive.String.vba
'                          ^                    keyword.control.line-continuation.vba
    = _
'   ^                                           keyword.operator.assignment.vba
'     ^                                         keyword.control.line-continuation.vba
    "Something", _
'   ^^^^^^^^^^^                                 string.quoted.double.vba
'              ^                                punctuation.separator.vba
'                ^                              keyword.control.line-continuation.vba
    biz _
'   ^^^                                         variable.parameter.vba
'       ^                                       keyword.control.line-continuation.vba
    As String, _
'   ^^                                          keyword.control.as.vba
'      ^^^^^^                                   support.type.primitive.String.vba
'            ^                                  punctuation.separator.vba
'              ^                                keyword.control.line-continuation.vba
    Optional _
'   ^^^^^^^^                                    storage.type.modifier.vba
'            ^                                  keyword.control.line-continuation.vba
    ByRef _
'   ^^^^^                                       storage.modifier.ByRef.vba
'         ^                                     keyword.control.line-continuation.vba
    bix As _
'   ^^^                                         variable.parameter.vba
'       ^^                                      keyword.control.as.vba
'          ^                                    keyword.control.line-continuation.vba
    String, _
'   ^^^^^^                                      support.type.primitive.String.vba
'         ^                                     punctuation.separator.vba
'           ^                                   keyword.control.line-continuation.vba
    bax _
'   ^^^                                         variable.parameter.vba
'       ^                                       keyword.control.line-continuation.vba
    As _
'   ^^                                          keyword.control.as.vba
'      ^                                        keyword.control.line-continuation.vba
    Object)
'   ^^^^^^                                      support.type.object.Object.vba

End Sub
'<--------                                      storage.type.method.close.vba
