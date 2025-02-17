'  SYNTAX TEST "source.vba" "declarations"

' Variable, constant, and function declarations.

Dim     x As Long, y As Long, z ' Comment
'<-------------------------------           meta.declare.variable.vba
'<---                                       storage.type.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.declare.variable.vba
Private x As Long, y As Long, z ' Comment
'<-------------------------------           meta.declare.Private.vba
'<-------                                   storage.modifier.visibility.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.declare.variable.vba
Public  x As Long, y As Long, z ' Comment
'<-------------------------------           meta.declare.Public.vba
'<------                                    storage.modifier.visibility.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.declare.variable.vba
Global  x As Long, y As Long, z ' Comment
'<-------------------------------           meta.declare.Global.vba
'<------                                    storage.modifier.visibility.vba
'       ^          ^          ^             variable.other.readwrite.vba
'         ^^         ^^                     keyword.control.as.vba
'            ^^^^       ^^^^                support.type.primitive.Long.vba
'                ^          ^               punctuation.separator.vba
'                               ^^^^^^^^^   comment.line.apostrophe.vba - meta.declare.variable.vba
Dim     x As New Object, y as New Object ' Comment
'<----------------------------------------          meta.declare.variable.vba
'<---                                               storage.type.vba
'       ^                ^                          variable.other.readwrite.vba
'         ^^               ^^                       keyword.control.as.vba
'            ^^^              ^^^                   keyword.storage.new.vba
'                ^^^^^^           ^^^^^^            support.type.object.Object.vba
'                      ^                            punctuation.separator.vba
'                                        ^^^^^^^^^  comment.line.apostrophe.vba - meta.declare.variable.vba

        Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.declare.constant.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                       ^              ^                    keyword.operator.assignment.vba
'                         ^              ^      ^           constant.numeric.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.declare.variable.vba
Private Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.declare.constant.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.declare.variable.vba
Public  Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.declare.constant.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.declare.variable.vba
Global  Const X As Long = 0, Y As Long = 0, Z = 0 ' Comment
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^           meta.declare.constant.vba
'       ^^^^^                                               storage.type.vba
'             ^              ^              ^               variable.other.constant
'               ^^             ^^                           keyword.control.as.vba
'                  ^^^^           ^^^^                      support.type.primitive.Long.vba
'                          ^              ^                 punctuation.separator.vba
'                                                 ^^^^^^^^^ comment.line.apostrophe.vba - meta.declare.variable.vba



Dim x As Long, _
'<---               meta.declare.variable.vba storage.type.vba
'   ^               meta.declare.variable.vba variable.other.readwrite.vba
'     ^^            meta.declare.variable.vba keyword.control.as.vba
'        ^^^^       meta.declare.variable.vba support.type.primitive.Long.vba
'            ^      meta.declare.variable.vba punctuation.separator.vba
'              ^    meta.declare.variable.vba keyword.control.line-continuation.vba
    y As Long, _
'   ^               meta.declare.variable.vba variable.other.readwrite.vba
'     ^^            meta.declare.variable.vba keyword.control.as.vba
'        ^^^^       meta.declare.variable.vba support.type.primitive.Long.vba
'            ^      meta.declare.variable.vba punctuation.separator.vba
'              ^    meta.declare.variable.vba keyword.control.line-continuation.vba
    z ' Comment
'   ^               meta.declare.variable.vba variable.other.readwrite.vba
'     ^^^^^^^^^     comment.line.apostrophe.vba - meta.declare.variable.vba


Const X As Long = 0, _
'<-----                 meta.declare.constant.vba storage.type.vba
'     ^                 meta.declare.constant.vba variable.other.constant
'       ^^              meta.declare.constant.vba keyword.control.as.vba
'          ^^^^         meta.declare.constant.vba support.type.primitive.Long.vba
'               ^       meta.declare.constant.vba keyword.operator.assignment.vba
'                 ^     meta.declare.constant.vba constant.numeric.vba
'                    ^  meta.declare.constant.vba keyword.control.line-continuation.vba
    Y As Long = 0, _
'   ^                   meta.declare.constant.vba variable.other.constant
'     ^^                meta.declare.constant.vba keyword.control.as.vba
'        ^^^^           meta.declare.constant.vba support.type.primitive.Long.vba
'             ^         meta.declare.constant.vba keyword.operator.assignment.vba
'               ^       meta.declare.constant.vba constant.numeric.vba
'                  ^    meta.declare.constant.vba keyword.control.line-continuation.vba    
    Z = 0 ' Comment
'   ^                   meta.declare.constant.vba variable.other.constant
'     ^                 meta.declare.constant.vba keyword.operator.assignment.vba
'       ^               meta.declare.constant.vba constant.numeric.vba
'         ^^^^^^^^^     comment.line.apostrophe.vba - meta.declare.variable.vba

Dim foo(1 To 5) As Long, bar(2 To 7)
' <------------------------------------ meta.declare.variable.vba
'      ^^^^^^^^             ^^^^^^^^    meta.declare.array-bounds.vba

    Dim _
'   ^^^     storage.type.vba
    x _
'   ^       variable.other.readwrite.vba
    ( _
'   ^^^     meta.declare.array-bounds.vba
    1 _
'   ^       constant.numeric.vba
    To _
'   ^^      keyword.operator.range.vba
    3 _
'   ^       constant.numeric.vba
    , _
'   ^       punctuation.separator.vba - meta.expression.vba
    4 _
'   ^       constant.numeric.vba
    To _
'   ^^      keyword.operator.range.vba
    7 _
'   ^       constant.numeric.vba
    , _
'   ^       punctuation.separator.vba - meta.expression.vba
    3 _
'   ^       constant.numeric.vba
    ) _
    As _
'   ^^      keyword.control.as.vba
    Long: Private _
'   ^^^^            meta.declare.variable.vba support.type.primitive.Long.vba
'       ^           keyword.control.line-separator.vba - meta.declare.variable.vba
'         ^^^^^^^   meta.declare.Private.vba storage.modifier.visibility.vba
    Const _
'   ^^^^^           meta.declare.constant.vba storage.type.vba
    BAZ _
'   ^^^             variable.other.constant
    As _
'   ^^              keyword.control.as.vba
    New _
'   ^^^             keyword.storage.new.vba
    Dictionary _
'   ^^^^^^^^^^      meta.declare.constant.vba support.type.object.Dictionary.vba
    = _
'   ^               keyword.operator.assignment.vba
    100
'   ^^^             constant.numeric.vba

'   Function declarations.
    Private Declare PtrSafe Function AccessibleObjectFromWindow Lib "oleacc" Alias "foo" (ByVal hwnd As LongPtr, ByVal dwId As Long, riid As tGUID, ppvObject As Object) As Long
'   ^^^^^^^        																																									storage.modifier.visibility.vba
'           ^^^^^^^                                                                                                                                                                 meta.declare.function.vba storage.type.vba
'                   ^^^^^^^                                                                                                                                                         meta.declare.function.vba storage.modifier.ptrsafe.vba
'                           ^^^^^^^^                                                                                                                                                meta.declare.function.vba storage.type.Function.vba
'                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^                                                                                                                     meta.declare.function.vba entity.name.function.vba
'                                                               ^^^          ^^^^^                                                                                                  meta.declare.function.vba storage.type.dll.vba
'                                                                   ^^^^^^^^       ^^^^^                                                                                            meta.declare.function.vba string.quoted.double.vba
'                                                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             meta.declare.function.vba meta.arguments.signature.vba
'                                                                                                                                                                         ^^^^^^^   meta.declare.function.vba meta.argument-signature.as.vba
    Private Declare Function AccessibleObjectFromWindow Lib "oleacc" Alias "foo" (ByVal hwnd As LongPtr, ByVal dwId As Long, riid As tGUID, ppvObject As Object) As Long
'   ^^^^^^^                                                                                                                                                                 storage.modifier.visibility.vba
'           ^^^^^^^                                                                                                                                                         meta.declare.function.vba storage.type.vba
'                   ^^^^^^^^                                                                                                                                                meta.declare.function.vba storage.type.Function.vba
'                            ^^^^^^^^^^^^^^^^^^^^^^^^^^                                                                                                                     meta.declare.function.vba entity.name.function.vba
'                                                       ^^^          ^^^^^                                                                                                  meta.declare.function.vba storage.type.dll.vba
'                                                           ^^^^^^^^       ^^^^^                                                                                            meta.declare.function.vba string.quoted.double.vba
'                                                                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             meta.declare.function.vba meta.arguments.signature.vba
'                                                                                                                                                                 ^^^^^^^   meta.declare.function.vba meta.argument-signature.as.vba
    Private Declare PtrSafe Function AccessibleObjectFromWindow Lib "oleacc" (ByVal hwnd As LongPtr, ByVal dwId As Long, riid As tGUID, ppvObject As Object) As Long
'   ^^^^^^^                                                                                                                                                             storage.modifier.visibility.vba
'           ^^^^^^^                                                                                                                                                     meta.declare.function.vba storage.type.vba
'                   ^^^^^^^                                                                                                                                             meta.declare.function.vba storage.modifier.ptrsafe.vba
'                           ^^^^^^^^                                                                                                                                    meta.declare.function.vba storage.type.Function.vba
'                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^                                                                                                         meta.declare.function.vba entity.name.function.vba
'                                                               ^^^                                                                                                     meta.declare.function.vba storage.type.dll.vba
'                                                                   ^^^^^^^^                                                                                            meta.declare.function.vba string.quoted.double.vba
'                                                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             meta.declare.function.vba meta.arguments.signature.vba
'                                                                                                                                                            ^^^^^^^    meta.declare.function.vba meta.argument-signature.as.vba
    Private Declare Function AccessibleObjectFromWindow Lib "oleacc" (ByVal hwnd As LongPtr, ByVal dwId As Long, riid As tGUID, ppvObject As Object)
'   ^^^^^^^                                                                                                                                             storage.modifier.visibility.vba
'           ^^^^^^^                                                                                                                                     meta.declare.function.vba storage.type.vba
'                   ^^^^^^^^                                                                                                                            meta.declare.function.vba storage.type.Function.vba
'                            ^^^^^^^^^^^^^^^^^^^^^^^^^^                                                                                                 meta.declare.function.vba entity.name.function.vba
'                                                       ^^^                                                                                             meta.declare.function.vba storage.type.dll.vba
'                                                           ^^^^^^^^                                                                                    meta.declare.function.vba string.quoted.double.vba
'                                                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     meta.declare.function.vba meta.arguments.signature.vba

'   Function declaration multi-line stress test.
    Public _
'   ^^^^^^                          storage.modifier.visibility.vba
    Declare _
'   ^^^^^^^                         meta.declare.function.vba storage.type.vba
    PtrSafe _
'   ^^^^^^^                         meta.declare.function.vba storage.modifier.ptrsafe.vba
    Sub _
'   ^^^                             meta.declare.function.vba storage.type.Sub.vba
    AccessibleObjectFromWindow _
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^      meta.declare.function.vba entity.name.function.vba
    Lib _
'   ^^^                             meta.declare.function.vba storage.type.dll.vba
    "oleacc" _
'   ^^^^^^^^                        meta.declare.function.vba string.quoted.double.vba
    Alias _
'   ^^^^^                           meta.declare.function.vba storage.type.dll.vba
    "ccaelo" _
'   ^^^^^^^^                        meta.declare.function.vba string.quoted.double.vba
    (ByVal hwnd As LongPtr) _
'    ^^^^^^^^^^^^^^^^^^^^^          meta.declare.function.vba meta.arguments.signature.vba
    As Long
'   ^^^^^^^                         meta.declare.function.vba meta.argument-signature.as.vba
