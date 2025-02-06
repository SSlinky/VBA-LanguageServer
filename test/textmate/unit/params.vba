'  SYNTAX TEST "source.vba" "params"

' Parameters passed to method calls.

Sub SubCallTesting()
    Foo bar, True, "abc,123", func(123, &H0000) ' Comment
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             meta.sub-call.vba
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             meta.arguments.vba
'   ^^^                                                     entity.name.function.call.vba
'       ^^^                                                 meta.variable-or-property.vba variable.other.object.vba
'          ^     ^          ^         ^                     punctuation.separator.vba
'            ^^^^                                           constant.language.boolean.vba
'                  ^^^^^^^^^                                string.quoted.double.vba
'                             ^^^^^^^^^^^^^^^^^             meta.function.call.vba
'                                  ^^^                      constant.numeric.vba
'                                       ^^^^^^              constant.numeric.hex.vba
'                                                ^^^^^^^^   comment.line.apostrophe.vba - meta.sub-call.vba

    Foo bar, _
'   ^^^^^^^^^^              meta.sub-call.vba
'       ^^^                 meta.arguments.vba meta.variable-or-property.vba variable.other.object.vba
'          ^                meta.arguments.vba punctuation.separator.vba
'            ^              meta.arguments.vba keyword.control.line-continuation.vba
        True, _
'       ^^^^                meta.arguments.vba constant.language.boolean.vba
        "abc,123", _
'       ^^^^^^^^^           meta.arguments.vba string.quoted.double.vba
'                ^          meta.arguments.vba punctuation.separator.vba
'                  ^        meta.arguments.vba keyword.control.line-continuation.vba
        func(123, &H0000)
'       ^^^^^^^^^^^^^^^^^   meta.function.call.vba
'            ^^^^^^^^^^^    meta.arguments.vba meta.arguments.vba
'            ^^^            constant.numeric.vba
'               ^           meta.arguments.vba punctuation.separator.vba
'                 ^^^^^^    constant.numeric.hex.vba
End Sub

Sub FuncCallTesting()
    x = Foo(bar, True, "abc,123", Func&(123, &H0000)) ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.function.call.vba
'           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^            meta.arguments.vba
'              ^     ^          ^          ^                    punctuation.separator.vba
'           ^^^                                                 meta.variable-or-property.vba variable.other.object.vba
'                ^^^^                                           constant.language.boolean.vba
'                      ^^^^^^^^^                                string.quoted.double.vba
'                                 ^^^^^^^^^^^^^^^^^^            meta.function.call.vba
'                                 ^^^^                          entity.name.function.call.vba
'                                     ^                         support.type.primitive.vba
'                                       ^^^                     constant.numeric.vba
'                                            ^^^^^^             constant.numeric.hex.vba
'                                                     ^^^^^^^^  comment.line.apostrophe.vba - meta.function.call.vba

    x = Foo(bar, _
'       ^^^                             meta.function.call.vba entity.name.function.call.vba
'           ^^^                         meta.function.call.vba meta.arguments.vba variable.other.object.vba
'              ^                        meta.function.call.vba meta.arguments.vba punctuation.separator.vba
'                ^                      meta.function.call.vba meta.arguments.vba keyword.control.line-continuation.vba
        True, _         
'       ^^^^                            meta.function.call.vba meta.arguments.vba constant.language.boolean.vba
'           ^                           meta.function.call.vba meta.arguments.vba punctuation.separator.vba
'             ^                         meta.function.call.vba meta.arguments.vba keyword.control.line-continuation.vba
        "abc,123", _            
'       ^^^^^^^^^                       meta.function.call.vba meta.arguments.vba string.quoted.double.vba
'                ^                      meta.function.call.vba meta.arguments.vba punctuation.separator.vba
'                  ^                    meta.function.call.vba meta.arguments.vba keyword.control.line-continuation.vba
        func&(123, &H0000)) ' Comment
'       ^^^^^^^^^^^^^^^^^               meta.function.call.vba meta.arguments.vba meta.function.call.vba
'       ^^^^                            meta.function.call.vba meta.arguments.vba meta.function.call.vba entity.name.function.call.vba
'           ^                           meta.function.call.vba meta.arguments.vba meta.function.call.vba support.type.primitive.vba
'             ^^^                       meta.function.call.vba meta.arguments.vba meta.function.call.vba meta.arguments.vba constant.numeric.vba
'                ^                      meta.function.call.vba meta.arguments.vba meta.function.call.vba meta.arguments.vba punctuation.separator.vba
'                  ^^^^^^               meta.function.call.vba meta.arguments.vba meta.function.call.vba meta.arguments.vba constant.numeric.hex.vba
'                           ^^^^^^^^^   comment.line.apostrophe.vba - meta.function.call.vba
End Sub