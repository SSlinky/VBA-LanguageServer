Attribute VB_Name = "DictionaryTests"
' Copyright 2023 Sam Vanderslink
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


Private passTests As New Collection
Private failTests As New Collection

Public Sub RunTests()
Attribute RunTests.VB_Description = "Runs all tests."
'   Runs all tests.
'
    Set passTests = New Collection
    Set failTests = New Collection

    Dim testName As Variant
    For Each testName In GetTestNames()
        RunTest CStr(testName)
    Next testName

    Dim p As Long, f As Long
    p = passTests.Count
    f = failTests.Count

    Debug.Print "-------------------------------------------"
    Debug.Print "   Passed: " & p & " (" & Format(p / (p + f), "0.00%)")
    Debug.Print "   Failed: " & f & " (" & Format(f / (p + f), "0.00%)")
    Debug.Print "-------------------------------------------"

End Sub

Sub RunSingle()
    Dim tr As TestResult
    Set tr = TestDictionary_AddKeyOnly()
    tr.Name = "TestDictionary_AddKeyOnly"
    Debug.Print tr.ToString
End Sub

Private Sub RunTest(testName As String)
Attribute RunTest.VB_Description = "Runs the named test and stores the result."
'   Runs the named test and stores the result.
'
'   Args:
'       testName: The name of the function returning a TestResult.
'
    Dim tr As TestResult
    Set tr = Application.Run(testName)
    tr.Name = testName
    Debug.Print tr.ToString

    If tr.Failed Then failTests.Add tr Else passTests.Add tr
End Sub

Private Function GetTestNames() As Collection
Attribute GetTestNames.VB_Description = "Gets the test names from this module."
'   Gets the test names from this module.
'   A valid test starts with Private Function TestDictionary_ and takes no args.
'
'   Returns:
'       A collection of strings representing names of tests.
'
    Const MODULENAME As String = "DictionaryTests"
    Const FUNCTIONID As String = "Private Function "
    Const TESTSTARTW As String = "Private Function TestDictionary_"

    Dim tswLen As Long
    tswLen = Len(TESTSTARTW)

    Dim codeMod As Object
    Set codeMod = ThisWorkbook.VBProject.VBComponents(MODULENAME).CodeModule

    Dim i As Long
    Dim results As New Collection
    For i = 1 To codeMod.CountOfLines
        Dim lineContent As String
        lineContent = codeMod.Lines(i, 1)

        If Left(lineContent, tswLen) = TESTSTARTW Then
            Dim funcName As String
            funcName = Split(Split(lineContent, FUNCTIONID)(1), "(")(0)
            results.Add funcName
        End If
    Next i

    Set GetTestNames = results
End Function

Private Function TestDictionary_Add() As TestResult
Attribute TestDictionary_Add.VB_Description = "Add an item to the dictionary."
'   Add an item to the dictionary.
    Dim tr As New TestResult

'   Arrange
    Const ADDKEY As String = "K"
    Const ADDVAL As String = "V"
    Dim d As New Dictionary

'   Act
    On Error Resume Next
    d.Add ADDKEY, ADDVAL

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(1, d.Count) Then GoTo Finally
    If tr.AssertAreEqual(ADDVAL, d(ADDKEY)) Then GoTo Finally

Finally:
    On Error GoTo 0
    Set TestDictionary_Add = tr
End Function

Private Function TestDictionary_AddKeyOnly() As TestResult
Attribute TestDictionary_AddKeyOnly.VB_Description = "Adding a key with no value to the dictionary."
'   Adding a key with no value to the dictionary.
    Dim tr As New TestResult

'   Arrange
    Const ADDKEY As String = "K"
    Dim d As New Dictionary

'   Act
    On Error Resume Next
    d.Add ADDKEY

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(1, d.Count) Then GoTo Finally
    If tr.AssertIsTrue(d.Exists(ADDKEY), "Key exists") Then GoTo Finally
    If tr.AssertAreEqual(Nothing, d(ADDKEY)) Then GoTo Finally

Finally:
    On Error GoTo 0
    Set TestDictionary_AddKeyOnly = tr
End Function

Private Function TestDictionary_AddBulkColMode() As TestResult
Attribute TestDictionary_AddBulkColMode.VB_Description = "Add bulk items to the dictionary."
'   Add bulk items to the dictionary.
    Dim tr As New TestResult

'   Arrange
    Dim bulkData() As Variant
    ReDim bulkData(1 To 3, 1 To 4)

    Const HDRS As String = "ABC"
    Const VALS As String = " 123"

    Dim i As Long
    For i = 1 To UBound(bulkData, 1)
        Dim j As Long
        For j = 1 To UBound(bulkData, 2)
            If j = 1 Then
                bulkData(i, j) = Mid(HDRS, i, 1)
            Else
                bulkData(i, j) = Mid(HDRS, i, 1) & Mid(VALS, j, 1)
            End If
        Next j
    Next i

    Dim d As New Dictionary

'   Act
    On Error Resume Next
    d.AddBulk bulkData

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(Len(HDRS), d.Count) Then GoTo Finally

    For i = 1 To UBound(bulkData, 1)
        For j = 2 To UBound(bulkData, 2)
            If d(bulkData(i, 1))(j - 2) <> bulkData(i, j) Then
                tr.Failed = True
                tr.Message = "Dictionary data failed validation."
            End If
        Next j
    Next i

Finally:
    On Error GoTo 0
    Set TestDictionary_AddBulkColMode = tr
End Function

Private Function TestDictionary_AddBulkRowMode() As TestResult
Attribute TestDictionary_AddBulkRowMode.VB_Description = "Add bulk items to the dictionary."
'   Add bulk items to the dictionary.
    Dim tr As New TestResult

'   Arrange
    Dim bulkData() As Variant
    ReDim bulkData(1 To 3, 1 To 4)

    Const HDRS As String = "ABC"
    Const VALS As String = " 123"

    Dim i As Long
    For i = 1 To UBound(bulkData, 1)
        Dim j As Long
        For j = 1 To UBound(bulkData, 2)
            If j = 1 Then
                bulkData(i, j) = Mid(HDRS, i, 1)
            Else
                bulkData(i, j) = Mid(HDRS, i, 1) & Mid(VALS, j, 1)
            End If
        Next j
    Next i

    Dim d As New Dictionary

'   Act
    On Error Resume Next
    d.AddBulk Application.Transpose(bulkData), OptionUseRowMode:=True

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(Len(HDRS), d.Count, "count headers") Then GoTo Finally

    For i = 1 To UBound(bulkData, 1)
        For j = 2 To UBound(bulkData, 2)
            If d(bulkData(i, 1))(j - 2) <> bulkData(i, j) Then
                tr.Failed = True
                tr.Message = "Dictionary data failed validation."
            End If
        Next j
    Next i

Finally:
    On Error GoTo 0
    Set TestDictionary_AddBulkRowMode = tr
End Function

Private Function TestDictionary_AddBulkCountKeys() As TestResult
Attribute TestDictionary_AddBulkCountKeys.VB_Description = "Add bulk items to the dictionary."
'   Add bulk items to the dictionary.
    Dim tr As New TestResult

'   Arrange
    Dim bulkData() As Variant
    ReDim bulkData(1 To 6, 1 To 1)

    Const HDRS As String = "ABC"
    Const VALS As String = "123"

    Dim i As Long
    For i = 1 To Len(HDRS)
        Dim j As Long
        For j = 1 To CLng(Mid(VALS, i, 1))
            Dim n As Long
            n = n + 1
            bulkData(n, 1) = Mid(HDRS, i, 1)
        Next j
    Next i

    Dim d As New Dictionary

'   Act
    On Error Resume Next
    d.AddBulk bulkData, OptionCountKeys:=True

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(Len(HDRS), d.Count, "count keys") Then GoTo Finally

    For i = 1 To Len(HDRS)
        Dim h As String, v As Long
        h = Mid(HDRS, i, 1)
        v = CLng(Mid(VALS, i, 1))
        If tr.AssertAreEqual(v, d(h), h) Then Exit For
    Next i

Finally:
    Set TestDictionary_AddBulkCountKeys = tr
End Function

Private Function TestDictionary_AddBulkCountKeysRowMode() As TestResult
Attribute TestDictionary_AddBulkCountKeysRowMode.VB_Description = "Github issue #4 Counting keys using row mode errors with duplicate key."
'   Github issue #4 Counting keys using row mode errors with duplicate key.
    Dim tr As New TestResult

'   Arrange
    Dim bulkData() As Variant
    ReDim bulkData(1 To 6, 1 To 1)

    Const HDRS As String = "ABC"
    Const VALS As String = "123"

    Dim i As Long
    For i = 1 To Len(HDRS)
        Dim j As Long
        For j = 1 To CLng(Mid(VALS, i, 1))
            Dim n As Long
            n = n + 1
            bulkData(n, 1) = Mid(HDRS, i, 1)
        Next j
    Next i

    Dim d As New Dictionary

'   Act
    On Error Resume Next
    d.AddBulk Application.Transpose(bulkData), _
        OptionCountKeys:=True, _
        OptionUseRowMode:=True

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(Len(HDRS), d.Count, "count keys") Then GoTo Finally

    For i = 1 To Len(HDRS)
        Dim h As String, v As Long
        h = Mid(HDRS, i, 1)
        v = CLng(Mid(VALS, i, 1))
        If tr.AssertAreEqual(v, d(h), h) Then Exit For
    Next i

Finally:
    Set TestDictionary_AddBulkCountKeysRowMode = tr
End Function

Private Function TestDictionary_CountItems() As TestResult
Attribute TestDictionary_CountItems.VB_Description = "Tests the Count property of the dictionary."
'   Tests the Count property of the dictionary.
'
    Dim tr As New TestResult

'   Arrange
    Const ADDKEYS As String = "ABCDEFGHIJKLMNOP"

'   Act and Assert
    Dim d As New Dictionary
    If tr.AssertAreEqual(0, d.Count, "count keys") Then GoTo Finally

    Dim i As Long
    For i = 1 To Len(ADDKEYS)
        d.Add Mid(ADDKEYS, i, 1), Nothing
        If tr.AssertAreEqual(i, d.Count, "count keys at " & i) Then Exit For
    Next i

Finally:
    Set TestDictionary_CountItems = tr
End Function

Private Function TestDictionary_ItemReturnsItem() As TestResult
Attribute TestDictionary_ItemReturnsItem.VB_Description = "Tests the default and explicit item return."
'   Tests the default and explicit item return.
    Dim tr As New TestResult

'   Arrange
    Const EXPRESA As String = "A Result"
    Const EXPRESB As String = "B Result"
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"

'   Act
    Dim d As New Dictionary
    d.Add INPKEYA, EXPRESA
    d.Add INPKEYB, EXPRESB

'   Assert
    If tr.AssertAreEqual(EXPRESA, d.Item(INPKEYA), INPKEYA) Then GoTo Finally
    If tr.AssertAreEqual(EXPRESB, d(INPKEYB), INPKEYB) Then GoTo Finally

Finally:
    Set TestDictionary_ItemReturnsItem = tr
End Function

Private Function TestDictionary_Exists() As TestResult
Attribute TestDictionary_Exists.VB_Description = "Tests Exists property works positively and negatively."
'   Tests Exists property works positively and negatively.
    Dim tr As New TestResult

'   Arrange
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"
    Dim d As New Dictionary
    d.Add INPKEYA, Nothing

'   Act
    Dim posResult As Boolean
    posResult = d.Exists(INPKEYA)

    Dim negResult As Boolean
    negResult = d.Exists(INPKEYB)

'   Assert
    If tr.AssertIsTrue(posResult, "positive check") Then GoTo Finally
    If tr.AssertIsFalse(negResult, "negative check") Then GoTo Finally

Finally:
    Set TestDictionary_Exists = tr
End Function

Private Function TestDictionary_GetItemsReturnsAllItems() As TestResult
Attribute TestDictionary_GetItemsReturnsAllItems.VB_Description = "Test Items returns all items."
'   Test Items returns all items.
    Dim tr As New TestResult

'   Arrange
    Const EXPRESA As String = "A Result"
    Const EXPRESB As String = "B Result"
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"

    Dim d As New Dictionary
    d.Add INPKEYA, EXPRESA
    d.Add INPKEYB, EXPRESB

'   Act
    Dim result As Variant
    result = d.Items()

'   Assert
    On Error Resume Next
    If tr.AssertAreEqual(EXPRESA, result(0), INPKEYA) Then GoTo Finally
    If tr.AssertAreEqual(EXPRESB, result(1), INPKEYB) Then GoTo Finally
    If tr.AssertNoException() Then GoTo Finally

Finally:
    Set TestDictionary_GetItemsReturnsAllItems = tr
End Function

Private Function TestDictionary_GetKeysReturnsKeys() As TestResult
Attribute TestDictionary_GetKeysReturnsKeys.VB_Description = "Test Keys returns all keys."
'   Test Keys returns all keys.
    Dim tr As New TestResult

'   Arrange
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"

    Dim d As New Dictionary
    d.Add INPKEYA, Nothing
    d.Add INPKEYB, Nothing

'   Act
    Dim result As Variant
    result = d.Keys()

'   Assert
    On Error Resume Next
    If tr.AssertAreEqual(INPKEYA, result(0)) Then GoTo Finally
    If tr.AssertAreEqual(INPKEYB, result(1)) Then GoTo Finally
    If tr.AssertNoException() Then GoTo Finally

Finally:
    Set TestDictionary_GetKeysReturnsKeys = tr
End Function

Private Function TestDictionary_GetDataReturnsData() As TestResult
Attribute TestDictionary_GetDataReturnsData.VB_Description = "Test data out matches data in."
'   Test data out matches data in.
    Dim tr As New TestResult

'   Arrange
    Dim bulkData() As Variant
    ReDim bulkData(1 To 3, 1 To 4)

    Const HDRS As String = "ABC"
    Const VALS As String = " 123"

    Dim i As Long
    For i = 1 To UBound(bulkData, 1)
        Dim j As Long
        For j = 1 To UBound(bulkData, 2)
            If j = 1 Then
                bulkData(i, j) = Mid(HDRS, i, 1)
            Else
                bulkData(i, j) = Mid(HDRS, i, 1) & Mid(VALS, j, 1)
            End If
        Next j
    Next i

    On Error Resume Next
    Dim d As New Dictionary
    d.AddBulk bulkData

'   Act
    Dim results As Variant
    results = d.GetData()

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    For i = 1 To UBound(bulkData, 1)
        For j = 2 To UBound(bulkData, 2)
            If results(i, j) <> bulkData(i, j) Then
                tr.Failed = True
                tr.Message = "Dictionary data failed validation."
            End If
        Next j
    Next i

Finally:
    Set TestDictionary_GetDataReturnsData = tr
End Function

Private Function TestDictionary_OptionNoItemFailOverwrites() As TestResult
Attribute TestDictionary_OptionNoItemFailOverwrites.VB_Description = "OptionNoItemFail overwrites rather than throwing."
'   OptionNoItemFail overwrites rather than throwing.
    Dim tr As New TestResult

'   Arrange
    Const INPKEYA As String = "A"
    Const INPVALA As String = "A Value"
    Const INPVALB As String = "Visibly different value to A"

'   Act
    Dim d As New Dictionary
    d.OptionNoItemFail = True

    On Error Resume Next
    d.Add INPKEYA, INPVALA
    d.Add INPKEYA, INPVALB

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(1, d.Count, "count") Then GoTo Finally
    If tr.AssertAreEqual(INPVALB, d(INPKEYA), INPKEYA) Then GoTo Finally

Finally:
    Set TestDictionary_OptionNoItemFailOverwrites = tr
End Function

Private Function TestDictionary_NoOptionNoItemFailThrows() As TestResult
Attribute TestDictionary_NoOptionNoItemFailThrows.VB_Description = "Without OptionNoItemFail throws rather than overwriting."
'   Without OptionNoItemFail throws rather than overwriting.
'   This test requires "Error Handling > Break on Unhandled Errors" set.
'   If "Break in class module" is set, the 
    Dim tr As New TestResult

'   Arrange
    Const DUPLICATEKEYEX As Long = 457
    Const INPKEYA As String = "A"
    Const INPVALA As String = "A Value"
    Const INPVALB As String = "A Value"

'   Act
    Dim d As New Dictionary
    d.OptionNoItemFail = False

    d.Add INPKEYA, INPVALA
    On Error Resume Next
    d.Add INPKEYA, INPVALB

'   Assert
    If tr.AssertRaised(vbObjectError + DUPLICATEKEYEX) Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(1, d.Count, "count") Then GoTo Finally
    If tr.AssertAreEqual(INPVALA, d(INPKEYA), INPKEYA) Then GoTo Finally

Finally:
    Set TestDictionary_NoOptionNoItemFailThrows = tr
End Function

Private Function TestDictionary_DataRowsAndColsCorrect() As TestResult
Attribute TestDictionary_DataRowsAndColsCorrect.VB_Description = "Tests the DataRows and DataCols properties."
'   Tests the DataRows and DataCols properties.
    Dim tr As New TestResult

'   Arrange
    Dim bulkData() As Variant
    ReDim bulkData(1 To 3, 1 To 4)

    Const HDRS As String = "ABC"
    Const VALS As String = " 123"

    Dim i As Long
    For i = 1 To UBound(bulkData, 1)
        Dim j As Long
        For j = 1 To UBound(bulkData, 2)
            If j = 1 Then
                bulkData(i, j) = Mid(HDRS, i, 1)
            Else
                bulkData(i, j) = Mid(HDRS, i, 1) & Mid(VALS, j, 1)
            End If
        Next j
    Next i

    On Error Resume Next
    Dim d As New Dictionary
    d.AddBulk bulkData

'   Act
    Dim dRowsColMode As Long
    dRowsColMode = d.DataRows()

    Dim dColsColMode As Long
    dColsColMode = d.DataCols()

    Dim dRowsRowMode As Long
    dRowsRowMode = d.DataRows(OptionUseRowMode:=True)

    Dim dColsRowMode As Long
    dColsRowMode = d.DataCols(OptionUseRowMode:=True)

'   Assert
    If tr.AssertNoException() Then GoTo Finally
    On Error GoTo 0

    If tr.AssertAreEqual(UBound(bulkData, 1), dRowsColMode) Then GoTo Finally
    If tr.AssertAreEqual(UBound(bulkData, 2), dColsColMode) Then GoTo Finally
    If tr.AssertAreEqual(UBound(bulkData, 2), dRowsRowMode) Then GoTo Finally
    If tr.AssertAreEqual(UBound(bulkData, 1), dColsRowMode) Then GoTo Finally

Finally:
    Set TestDictionary_DataRowsAndColsCorrect = tr
End Function

Private Function TestDictionary_RemoveRemovesKey() As TestResult
Attribute TestDictionary_RemoveRemovesKey.VB_Description = "Test that remove removes the key."
'   Test that remove removes the key.
    Dim tr As New TestResult

'   Arrange
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"

    Dim d As New Dictionary
    d.Add INPKEYA, Nothing
    d.Add INPKEYB, Nothing

'   Act
    d.Remove(INPKEYA)

'   Assert
    On Error Resume Next
    If tr.AssertIsFalse(d.Exists(INPKEYA), "key A exists") Then GoTo Finally
    If tr.AssertIsTrue(d.Exists(INPKEYB), "key B exists") Then GoTo Finally
    If tr.AssertNoException() Then GoTo Finally

Finally:
    On Error GoTo 0
    Set TestDictionary_RemoveRemovesKey = tr
End Function

Private Function TestDictionary_RemoveUpdatesMeta() As TestResult
Attribute TestDictionary_RemoveUpdatesMeta.VB_Description = "Github issue #3 Array tracking when largest element is removed."
'   Github issue #3 Array tracking when largest element is removed.
    Dim tr As New TestResult

'   Arrange
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"

    Dim inpValA() As Variant
    inpValA = Array(1, 2)

    Dim inpValB() As Variant
    inpValB = Array(1, 2, 3, 4)

    Dim d As New Dictionary
    d.Add INPKEYA, inpValA
    d.Add INPKEYB, inpValB

'   Act
    Dim beforeRemoveColCount As Long
    beforeRemoveColCount = d.DataCols()

    d.Remove INPKEYB

    Dim afterRemoveColCount As Long
    afterRemoveColCount = d.DataCols()

'   Assert
    On Error Resume Next
    If tr.AssertAreNotEqual(beforeRemoveColCount, afterRemoveColCount, "row counts") Then GoTo Finally
    If tr.AssertAreEqual(UBound(inpValB) + 2, beforeRemoveColCount) Then GoTo Finally
    If tr.AssertAreEqual(UBound(inpValA) + 2, afterRemoveColCount) Then GoTo Finally
    If tr.AssertNoException() Then GoTo Finally

Finally:
    On Error GoTo 0
    Set TestDictionary_RemoveUpdatesMeta = tr
End Function

Private Function TestDictionary_ExistWorksWithInteger() As TestResult
Attribute TestDictionary_ExistWorksWithInteger.VB_Description = "Github Issue #5 Integer keys are never found with .Exists method."
'   Github Issue #5 Integer keys are never found with .Exists method.
    Dim tr As New TestResult

'   Arrange
    Dim d As New Dictionary
    d.Add 0, Nothing

'   Act
    Dim result As Boolean
    result = d.Exists(0)

'   Assert
    If tr.AssertIsTrue(result, "result exists") Then GoTo Finally


Finally:
    Set TestDictionary_ExistWorksWithInteger = tr
End Function

Private Function TestDictionary_GetDataWorksWithVariableArrays() As TestResult
Attribute TestDictionary_GetDataWorksWithVariableArrays.VB_Description = "Github issue #2 Unexpected value array sizes can cause GetData to raise out of bounds error."
'   Github issue #2 Unexpected value array sizes can cause GetData to raise out of bounds error.
    Dim tr As New TestResult

'   Arrange
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"

    Dim inpValA() As Variant
    inpValA = Array(1, 2)

    Dim inpValB() As Variant
    inpValB = Array(1, 2, 3, 4)

    Dim d As New Dictionary
    d.Add INPKEYA, inpValA
    d.Add INPKEYB, inpValB

'   Act
    Dim results() As Variant
    results = d.GetData()

'   Assert
    If tr.AssertAreEqual(UBound(inpValB) + 2, UBound(results, 2)) Then GoTo Finally

Finally:
    Set TestDictionary_GetDataWorksWithVariableArrays = tr
End Function

Private Function TestDictionary_ForEach() As TestResult
Attribute TestDictionary_ForEach.VB_Description = "Tests the For Each functionality on keys."
'   Tests the For Each functionality on keys.
    Dim tr As New TestResult

'   Arrange
    Dim inpKeys() As Variant
    inpKeys = Array("a", "b", "c")

    Dim inpVals() As Variant
    inpVals = Array(1, 2, 3)

    Dim d As New Dictionary
    Dim i As Long
    For i = 0 To UBound(inpKeys)
        d.Add inpKeys(i), inpVals(i)
    Next i

'   Act and Assert
    i = 0
    Dim k As Variant
    For Each k In d.Keys
        If Not tr.AssertAreEqual(inpKeys(i), k) Then GoTo Finally
        If Not tr.AssertAreEqual(inpVals(i), d(k)) Then GoTo Finally
        i = i + 1
    Next k

Finally:
    Set TestDictionary_ForEach = tr
End Function

Private Function TestDictionary_GetValueGetsValue() As TestResult
Attribute TestDictionary_GetValueGetsValue.VB_Description = "Get value where key exists."
'   Get value where key exists.
    Dim tr As New TestResult

'   Arrange
    Const EXPRESA As String = "A Result"
    Const EXPRESB As String = "B Result"
    Const INPKEYA As String = "A"
    Const INPKEYB As String = "B"

'   Act
    Dim d As New Dictionary
    d.Add INPKEYA, EXPRESA

'   Assert
    If tr.AssertAreEqual(EXPRESA, d.GetValue(INPKEYA, EXPRESB), INPKEYA) Then GoTo Finally
    If tr.AssertAreNotEqual(EXPRESB, d.GetValue(INPKEYB, EXPRESA), INPKEYB) Then GoTo Finally
    If tr.AssertIs(Nothing, d.GetValue(INPKEYB), INPKEYB & " - no default") Then GoTo Finally

Finally:
    Set TestDictionary_GetValueGetsValue = tr
End Function
