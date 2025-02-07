'  SYNTAX TEST "source.vba" "comments"

' This is a comment with without indentation
' <-------------------------------------------- comment.line.apostrophe.vba

    ' This is a comment with indentation
'   ^^^^^^^^^^^^^^^^^^^ comment.line.apostrophe.vba

10 ' Comment with line number
' <-- constant.numeric.vba
'  ^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.line.apostrophe.vba

Label1: ' Comment with label
'       ^^^^^^^^^^^^^^^^^^^^ comment.line.apostrophe.vba

Dim x as Long 'Comment at the end of a line
'             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.line.apostrophe.vba

Dim x As Long: 'Comment with colon
'              ^^^^^^^^^^^^^^^^^^^ comment.line.apostrophe.vba

' This is the start of a comment block _
' ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.block.vba

' This is a comment _
  continued on the next line
' ^^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.block.vba

' This is a comment _
  continued on the next line _
  and another line
' ^^^^^^^^^^^^^^^^ comment.block.vba

Rem This is a remark without indentation
' <-------------------------------------- comment.line.remark.vba

    Rem This is a remark with indentation
'   ^^^^^^^^^^^^^^^^^^^^ comment.line.remark.vba

10 Rem Comment with line number
' <-- constant.numeric.vba
'  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.line.remark.vba

Label1: Rem Comment with label
'       ^^^^^^^^^^^^^^^^^^^^^^ comment.line.remark.vba

Dim x as Long Rem Comment at the end of a line
'             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ - comment.line.remark.vba

Dim x As Long: Rem Comment with colon
'              ^^^^^^^^^^^^^^^^^^^^^^ comment.line.remark.vba

  Rem This is the start of a comment block _
' ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.block.vba

Rem This is a comment _
  continued on the next line
' ^^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.block.vba

Rem This is a comment _
  continued on the next line _
  and another line
' ^^^^^^^^^^^^^^^^ comment.block.vba