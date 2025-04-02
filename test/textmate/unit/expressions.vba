'  SYNTAX TEST "source.vba" "expressions"

' Expressions as part of other statements.

Sub Test()
    foo = bar ' Comment
'         ^^^                           meta.expression.vba
'             ^^^^^^^^^                 comment.line.apostrophe.vba - meta.expression.vba
    foo.bar = "' Not comment"   
'             ^^^^^^^^^^^^^^^           meta.expression.vba
    foo.bar = bar.foo   
'             ^^^^^^^                   meta.expression.vba
    foo = bar And Not True  
'         ^^^^^^^^^^^^^^^^              meta.expression.vba
    foo = bar Or Not foo = 12   
'         ^^^^^^^^^^^^^^^^^^^           meta.expression.vba
    foo = Not bar   
'         ^^^^^^^                       meta.expression.vba
    foo = _ 
'         ^                             meta.expression.vba
        foo.bar.baz() _ 
'       ^^^^^^^^^^^^^^^                 meta.expression.vba
        + bar.foo.biz _ 
'       ^^^^^^^^^^^^^^^                 meta.expression.vba
'       ^                               keyword.operator.arithmetic.vba
        * 3 
'       ^^^                             meta.expression.vba
'       ^                               keyword.operator.arithmetic.vba

    foo = Not Me.Bar( _
'         ^^^^^^^^^^^^^                 meta.expression.vba
'         ^^^                           keyword.operator.logical.vba
'             ^^                        meta.function.call.vba variable.language.me.vba
'                ^^^                    meta.function.call.vba entity.name.function.call.vba
        foo, x = 3, False) ' Comment
'       ^^^^^^^^^^^^^^^^^               meta.expression.vba
'       ^^^  ^^^^^  ^^^^^               meta.expression.vba meta.expression.vba
'       ^^^  ^                          variable.other.readwrite.vba
'              ^                        keyword.operator.comparison.vba
'                ^                      constant.numeric.vba
'                   ^^^^^               constant.language.boolean.vba
'                          ^^^^^^^^^    comment.line.apostrophe.vba - meta.expression.vba

    If condA And Not Foo(condB) Then
'      ^^^^^^^^^^^^^^^^^^^^^^^^         meta.expression.vba
'            ^^^ ^^^                    keyword.operator.logical.vba
'                        ^^^^^          meta.expression.vba meta.expression.vba variable.other.readwrite.vba
    End If

    Set foo = bar
    Set foo = New bar
End Sub