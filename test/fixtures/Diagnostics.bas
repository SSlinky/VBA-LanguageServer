Attribute VB_Name = "Diagnostics"
Attribute VB_Name = "Diagnostics"
Attribute VB_Creatable = False
Attribute VB_Foo = False

Option Explicit

Public Sub UniqueNameFoo()
    Dim i As Long
    While True
        i = i ++ 1
        i = i <> 1
    Wend
End Sub

Sub UniqueNameIdentifier()
Attribute UniqueNameIdentifier.VB_Description = "Dosctring."
Attribute UniqueNameIdentifier.VB_Description = "Dosctring."
'   Dosctring.
'
'   Args:
'       param1:
'
'   Raises:
'
End Sub

Public Enum UniqueNameEnumFoo
    Enum1
    Enum2
    Enum3
End Enum

Public Sub CallsBadSub()
Attribute CallsBadSub.VB_Description = "docstring."
'   docstring.
'
'   Args:
'       param1:
'
'   Raises:
'
    InvalidSubCall(arg)
End Sub