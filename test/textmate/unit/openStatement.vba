'  SYNTAX TEST "source.vba" "open statements"

' Normal people tests
Sub Foo()
'   Mode: Input, Output, Binary, Random
    Open path For Input As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^   meta.open-statement.vba
'   ^^^^      ^^^       ^^      keyword.control.vba
'        ^^^^                   meta.variable-or-property.vba
'                 ^^^^^         storage.type.vba
'                          ^    support.type.primitive.vba
'                           ^   constant.numeric.vba
    Open "xx" For Output As #f
'   ^^^^^^^^^^^^^^^^^^^^^^^^^   meta.open-statement.vba
'   ^^^^      ^^^        ^^     keyword.control.vba
'        ^^^^                   string.quoted.double.vba
'                 ^^^^^^        storage.type.vba
'                           ^   support.type.primitive.vba
'                            ^  meta.variable-or-property.vba
    Open .f.o For Binary As .f
'   ^^^^^^^^^^^^^^^^^^^^^^^^^   meta.open-statement.vba
'   ^^^^      ^^^        ^^     keyword.control.vba
'        ^^^^                   meta.variable-or-property.vba
'                 ^^^^^^        storage.type.vba
'                           ^^  meta.variable-or-property.vba

    Open xx() For Random As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^   meta.open-statement.vba
'   ^^^^      ^^^        ^^     keyword.control.vba
'        ^^^^                   meta.function.call.vba
'                 ^^^^^^        storage.type.vba
'                           ^   support.type.primitive.vba
'                            ^  constant.numeric.vba

'   Access: Read, Write
    Open xx() For Input Access Read As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     meta.open-statement.vba
'   ^^^^      ^^^       ^^^^^^          keyword.control.vba
'        ^^^^                           meta.function.call.vba
'                 ^^^^^        ^^^^     storage.type.vba

    Open path For Input Access Write As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    meta.open-statement.vba
'   ^^^^      ^^^       ^^^^^^          keyword.control.vba
'        ^^^^                           meta.variable-or-property.vba
'                 ^^^^^        ^^^^^    storage.type.vba


'   Lock: Read, Write, Read Write
    Open path For Input Lock Read As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   meta.open-statement.vba
'   ^^^^      ^^^       ^^^^        keyword.control.vba
'        ^^^^                       meta.variable-or-property.vba
'                 ^^^^^      ^^^^   storage.type.vba
    Open path For Input Lock Write As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  meta.open-statement.vba
'   ^^^^      ^^^       ^^^^        keyword.control.vba
'        ^^^^                       meta.variable-or-property.vba
'                 ^^^^^      ^^^^^  storage.type.vba
    Open path For Input Lock Read Write As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ meta.open-statement.vba
'   ^^^^      ^^^       ^^^^            keyword.control.vba
'        ^^^^                           meta.variable-or-property.vba
'                 ^^^^^      ^^^^ ^^^^^ storage.type.vba


'   Access / Lock
    Open path For Input Access Read Lock Read As #1
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   meta.open-statement.vba
'   ^^^^      ^^^       ^^^^^^      ^^^^        keyword.control.vba
'                 ^^^^^        ^^^^      ^^^^   storage.type.vba


    Open path For Random As #1 Len = Len(MyRecord)
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  meta.open-statement.vba
'   ^^^^      ^^^        ^^    ^^^                  keyword.control.vba
'                 ^^^^^^                            storage.type.vba
'                                  ^                keyword.operator.assignment.vba
'                                    ^^^^^^^^^^^^^  meta.expression.vba
End Sub

' Crazy people tests
Sub Bar()
    Open _
'   ^^^^                    keyword.control.vba
        foo _
'       ^^^                 meta.variable-or-property.vba
        For _
'       ^^^                 keyword.control.vba
        Binary _
'       ^^^^^^              storage.type.vba
        Access _
'       ^^^^^^              keyword.control.vba
        Read _
'       ^^^^                storage.type.vba
        Write _
'       ^^^^^               storage.type.vba
        As _
'       ^^                  keyword.control.vba
        #1 _
'       ^                   support.type.primitive.vba
'        ^                  constant.numeric.vba
        Len _
'       ^^^                 keyword.control.vba
        = _
'       ^                   keyword.operator.assignment.vba
        Len("abc") + 1
'       ^^^^^^^^^^^^^^      meta.expression.vba
End Sub