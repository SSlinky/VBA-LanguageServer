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
Dim x As Long, _
'<---               meta.variable.declaration.vba storage.modifier.declare-variable.vba
'   ^               meta.variable.declaration.vba variable.other.readwrite.vba
'     ^^            meta.variable.declaration.vba keyword.control.as.vba
'        ^^^^       meta.variable.declaration.vba support.type.primitive.Long.vba
'            ^      meta.variable.declaration.vba punctuation.separator.vba
'              ^    meta.variable.declaration.vba keyword.control.line-continuation.vba
    y As Long, _
'   ^               meta.variable.declaration.vba variable.other.readwrite.vba
'     ^^            meta.variable.declaration.vba keyword.control.as.vba
'        ^^^^       meta.variable.declaration.vba support.type.primitive.Long.vba
'            ^      meta.variable.declaration.vba punctuation.separator.vba
'              ^    meta.variable.declaration.vba keyword.control.line-continuation.vba
    z ' Comment
'   ^               meta.variable.declaration.vba variable.other.readwrite.vba
'     ^^^^^^^^^     comment.line.apostrophe.vba - meta.variable.declaration.vba
Const X As Long = 0, _
'<-----                 meta.const.declaration.vba storage.type.vba
'     ^                 meta.const.declaration.vba variable.other.constant
'       ^^              meta.const.declaration.vba keyword.control.as.vba
'          ^^^^         meta.const.declaration.vba support.type.primitive.Long.vba
'               ^       meta.const.declaration.vba keyword.operator.assignment.vba
'                 ^     meta.const.declaration.vba constant.numeric.vba
'                    ^  meta.const.declaration.vba keyword.control.line-continuation.vba
    Y As Long = 0, _
'   ^                   meta.const.declaration.vba variable.other.constant
'     ^^                meta.const.declaration.vba keyword.control.as.vba
'        ^^^^           meta.const.declaration.vba support.type.primitive.Long.vba
'             ^         meta.const.declaration.vba keyword.operator.assignment.vba
'               ^       meta.const.declaration.vba constant.numeric.vba
'                  ^    meta.const.declaration.vba keyword.control.line-continuation.vba    
    Z = 0 ' Comment
'   ^                   meta.const.declaration.vba variable.other.constant
'     ^                 meta.const.declaration.vba keyword.operator.assignment.vba
'       ^               meta.const.declaration.vba constant.numeric.vba
'         ^^^^^^^^^     comment.line.apostrophe.vba - meta.variable.declaration.vba