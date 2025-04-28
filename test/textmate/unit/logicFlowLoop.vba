'  SYNTAX TEST "source.vba" "loop for"

' Normal people for loops

Sub Foo()
'   Supports omitting Step.
    For i = 1 To 10
'   ^^^^^^^^^^^^^^^                                     meta.flow.for-loop.vba
'       ^^^^^^^^^^^                                     meta.for-iterator-loop.vba
'       ^                                               variable.other.readwrite.vba
'         ^                                             keyword.operator.assignment.vba
'           ^    ^^                                     constant.numeric.vba
'             ^^                                        keyword.control.flow.loop.vba
    Next i
'   ^^^^^^                                              meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Supports number literals.
    For i = 1 To 10 Step 2
'   ^^^^^^^^^^^^^^^^^^^^^^                              meta.flow.for-loop.vba
'       ^^^^^^^^^^^^^^^^^^                              meta.for-iterator-loop.vba
'       ^                                               variable.other.readwrite.vba
'         ^                                             keyword.operator.assignment.vba
'           ^    ^^      ^                              constant.numeric.vba
'             ^^    ^^^^                                keyword.control.flow.loop.vba
    Next i
'   ^^^^^^                                              meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Supports negative number literals.
    For i = -1 To -10 Step -2
'   ^^^^^^^^^^^^^^^^^^^^^^^^^                           meta.flow.for-loop.vba
'       ^^^^^^^^^^^^^^^^^^^^^                           meta.for-iterator-loop.vba
'       ^                                               variable.other.readwrite.vba
'         ^                                             keyword.operator.assignment.vba
'           ^^    ^^^      ^^                           constant.numeric.vba
'              ^^     ^^^^                              keyword.control.flow.loop.vba
    Next i
'   ^^^^^^                                              meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Supports properties.
    For i = .Low To .High Step .Step
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                    meta.flow.for-loop.vba
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^                    meta.for-iterator-loop.vba
'       ^                                               variable.other.readwrite.vba
'           ^^^^    ^^^^^      ^^^^^                    meta.variable-or-property.vba
'         ^                                             keyword.operator.assignment.vba
'                ^^       ^^^^                          keyword.control.flow.loop.vba
    Next i
'   ^^^^^^                                              meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Supports functions.
    For i = .GetLow() To .GetHigh() Step .GetStep()
    Next i
'   ^^^^^^                                              meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Simple for each.
    For Each obj In collection
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^                          meta.flow.for-loop.vba
'       ^^^^^^^^^^^^^^^^^^^^^^                          meta.for-each-loop.vba
'            ^^^    ^^^^^^^^^^                          meta.variable-or-property.vba
'                ^^                                     keyword.control.flow.loop.vba
    Next obj
'   ^^^^^^^^                                            meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Supports properties.
    For Each obj In .Collection
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^                         meta.flow.for-loop.vba
'       ^^^^^^^^^^^^^^^^^^^^^^^                         meta.for-each-loop.vba
'            ^^^    ^^^^^^^^^^^                         meta.variable-or-property.vba
'                ^^                                     keyword.control.flow.loop.vba
    Next obj
'   ^^^^^^^^                                            meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Supports functions.
    For Each obj In .Collection()
'   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                       meta.flow.for-loop.vba
'       ^^^^^^^^^^^^^^^^^^^^^^^^^                       meta.for-each-loop.vba
'            ^^^                                        meta.variable-or-property.vba
'                ^^                                     keyword.control.flow.loop.vba
'                   ^^^^^^^^^^^^^                       meta.function.call.vba
    Next obj
'   ^^^^^^^^                                            meta.flow.for-loop.vba
'   ^^^^                                                keyword.control.flow.loop.vba

'   Supports normal block things.
    For Each obj In collection
        For j = 1 To 10
'       ^^^^^^^^^^^^^^^                                 meta.flow.for-loop.vba
            If condition Then DoSomething
'           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^               meta.flow.inline-if.vba
        Next j
        
        For Each obj In collection
'       ^^^^^^^^^^^^^^^^^^^^^^^^^^                      meta.flow.for-loop.vba
        Next obj

        If condition Then
'       ^^^^^^^^^^^^^^^^^                               meta.block-if-else.vba
        End If
    Next obj 
End Sub

' Line continued tests

Sub Bar()
    For _
'   ^^^         keyword.control.flow.loop.vba    
    i _
'   ^           variable.other.readwrite.vba    
    = _
'   ^           keyword.operator.assignment.vba
    -2 _
'   ^^          constant.numeric.vba
    To _
'   ^^          keyword.control.flow.loop.vba
    10 _
'   ^^          constant.numeric.vba
    Step _
'   ^^^^        keyword.control.flow.loop.vba
    20
'   ^^          constant.numeric.vba
    Next i
'   ^^^^        keyword.control.flow.loop.vba
End Sub