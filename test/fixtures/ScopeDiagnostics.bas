Attribute VB_Name = "ScopeDiagnostics"

Option Explicit

Private Const ABC As Long = 0

Public Enum XfaskofeaFoo
    Enum1 = 2 ^ 1
    Bar = 2 ^ 2
    Bar = 2 ^ 3
End Enum

Public Sub XfaskofeaFoo()
Attribute XfaskofeaFoo.VB_Description = "docstring."

End Sub