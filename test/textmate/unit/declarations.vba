'  SYNTAX TEST "source.vba" "declarations"

' Variable, constant, and function declarations.


Dim     x As Long, y As Long, z ' Comment
'<-------------------------------           meta.variable.declaration.vba
'<---                                       storage.modifier.declare-variable.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.variable.declaration.vba
Private x As Long, y As Long, z ' Comment
'<-------------------------------           meta.variable.declaration.vba
'<-------                                   storage.modifier.declare-variable.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.variable.declaration.vba
Public  x As Long, y As Long, z ' Comment
'<-------------------------------           meta.variable.declaration.vba
'<------                                    storage.modifier.declare-variable.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.variable.declaration.vba
Global  x As Long, y As Long, z ' Comment
'<-------------------------------           meta.variable.declaration.vba
'<------                                    storage.modifier.declare-variable.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.variable.declaration.vba

        Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.const.declaration.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.variable.declaration.vba
Private Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.const.declaration.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.variable.declaration.vba
Public  Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.const.declaration.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.variable.declaration.vba
Global  Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.const.declaration.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.variable.declaration.vba
