Attribute VB_Name = "ScopeDiagnostics"

Option Explicit

Private Const ABC As Long = 0

Public Enum XfaskofeaFoo
    Enum1 = 2 ^ 1
    Bar = 2 ^ 2
    Bar = 2 ^ 3
End Enum

Public Sub XfaskofeaFoo(Optional test_param As Variant = -0.1)
Attribute XfaskofeaFoo.VB_Description = "docstring."
    Call SomeSub(param, -0.15)
End Sub