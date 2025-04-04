Attribute VB_Name = "ModuleName"
' Copyright 2024 Sam Vanderslink
' 
' Permission is hereby granted, free of charge, to any person obtaining a copy 
' of this software and associated documentation files (the "Software"), to deal 
' in the Software without restriction, including without limitation the rights 
' to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
' copies of the Software, and to permit persons to whom the Software is 
' furnished to do so, subject to the following conditions:
' 
' The above copyright notice and this permission notice shall be included in 
' all copies or substantial portions of the Software.
' 
' THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
' IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
' FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
' AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
' LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
' FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS 
' IN THE SOFTWARE.

Option Explicit


#If Mac Then
#ElseIf VBA7 Then
Sub Foo()
Debug.Print "Foo"
End Sub
#Else
Private Enum LongPtr
[_]
End Enum
Private Declare Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal lpDest As LongPtr, ByVal lpSource As LongPtr, ByVal iCount As Long)
#End If

#If VBA7 Then
Public Function Bar() As LongPtr
#Else
Public Function Bar() As Long
#End If
Bar = 0
End Function

#If VBA7 Then
#If Win64 Then
Const XXX As Long = 10
#Else
Const XXX As Long = 20
#End If
#Else
Const XXX As Long = 30
#End If