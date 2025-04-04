Attribute VB_Name = "FoldingRanges"
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

Public Sub Foo()
Attribute Foo.VB_Description = "Tests a folding range."
'   Tests a folding range.
'
'   Args:
'       param1:
'
'   Raises:
'

	If FoldingRanges Then
		If FoldingRanges Then
			Debug.Print "Great!"
		End If
	ElseIf UnfoldingRanges Then
		Debug.Print "What does this even mean?"
	Else
		Debug.Print "Not great..."
	End If
End Sub

Public Sub Bar()
Attribute Bar.VB_Description = "Tests more folding ranges."
'   Tests more folding ranges.
'
'   Args:
'       param1:
'
'   Raises:
'

	While True
        Debug.Print "You ain't never going home!"
        DoEvents
    Wend
End Sub


#If VBA7 Then
	Public Function FooBar() As LongPtr
#Else
	Public Function FooBar() As Long
#End If
	End Function