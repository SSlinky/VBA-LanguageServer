VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Dictionary"
Attribute VB_Description = "A wrapper that extends Scripting.Dictionary functionality."
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
' Copyright 2023 Sam Vanderslink
' sam.vanderslink@notis.net.au
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

'-------------------------------------------------------------------------------
'   Class: Dictionary
'   A wrapper that extends Scripting.Dictionary functionality.
'-------------------------------------------------------------------------------
'   Exceptions thrown by the Scripting.Dictionary bubble up to the Dictionary
'   but do not seem to go further than that, even if you have your own error
'   handling. That's why you'll see exception handling in here that rethrows the
'   exception. This is so that it can be caught by the calling method.
'       #JustVbaThings

' Enums
'-------------------------------------------------------------------------------
Enum CompareModeType
'   Performs a comparison by using the setting of the Option Compare statement.
    vbUseCompareOption = -1

'   Performs a binary comparison.
    vbBinaryCompare = 0

'   Performs a textual comparison.
    vbTextCompare = 1

'   Microsoft Access only.
'   Performs a comparison based on information in your database.
    vbDatabaseCompare = 2
End Enum


' Private Backing Store
'-------------------------------------------------------------------------------
Private mBaseDict As Object
Private mOptionNoItemFail As Boolean
Private mLargestValueSize


' Properties
'-------------------------------------------------------------------------------
Public Property Let OptionNoItemFail(val As Boolean)
Attribute OptionNoItemFail.VB_Description = "Prevents a duplicative item add from raising an exception."
'   Prevents a duplicative item add from raising an exception.
'
'   When setting an item, it overwrites the existing one.
'   When getting an item, it prevents the key from being added.
'
    mOptionNoItemFail = val
End Property

Public Property Get OptionNoItemFail() As Boolean
    OptionNoItemFail = mOptionNoItemFail
End Property

Public Property Let CompareMode(val As CompareModeType)
Attribute CompareMode.VB_Description = "Sets the compare mode for the dictionary."
'   Sets the compare mode for the dictionary.
'
'   A value representing the comparison mode used by functions such
'   as StrComp. Can only be changed while the dictionary has no data.
    mBaseDict.CompareMode = val
End Property

Public Property Get CompareMode() As CompareModeType
    CompareMode = mBaseDict.CompareMode
End Property

Public Property Get Count() As Variant
Attribute Count.VB_Description = "Gets the count of the items in the dictionary."
'   Gets the count of the items in the dictionary.
    Count = mBaseDict.Count
End Property

Public Property Let Item(Key As Variant, val As Variant)
Attribute Item.VB_UserMemId = 0
Attribute Item.VB_Description = "Sets or returns an item for a specified key in a Dictionary object."
'   Sets or returns an item for a specified key in a Dictionary object.
Try:
    On Error GoTo Catch
    mBaseDict.Item(Key) = val
    If Err = 0 Then MetaTrackingAdd val
    Exit Property

Catch:
    If mOptionNoItemFail Then Exit Property
    Err.Raise Err
End Property

Public Property Set Item(Key As Variant, val As Variant)
Try:
    On Error GoTo Catch
    Set mBaseDict.Item(Key) = val
    MetaTrackingAdd val
    Exit Property

Catch:
    If mOptionNoItemFail Then Exit Property
    Err.Raise Err
End Property

Public Property Get Item(Key As Variant) As Variant
    If mOptionNoItemFail And Not mBaseDict.Exists(Key) Then Exit Property

    If IsObject(mBaseDict.Item(Key)) Then
        Set Item = mBaseDict.Item(Key)
    Else
        Item = mBaseDict.Item(Key)
    End If
End Property

Public Property Let Key(Key As Variant, NewKey As Variant)
Attribute Key.VB_Description = "Updates an existing key with a new one."
'   Updates an existing key with a new one.
    mBaseDict.Key(Key) = NewKey
End Property

Public Property Get GetValue(Key As Variant, Optional def As Variant) As Variant
Attribute GetValue.VB_Description = "Gets a value for the specified key or returns the default. if not found"
'   Gets a value for the specified key or returns the default if not found.
    If mBaseDict.Exists(Key) Then
        If IsObject(mBaseDict.Item(Key)) Then
            Set GetValue = mBaseDict.Item(Key)
        Else
            GetValue = mBaseDict.Item(Key)
        End If
    Else
        Select Case True
            Case Is = IsMissing(def):
                Set GetValue = Nothing
            Case Is = IsObject(def):
                Set GetValue = def
            Case Else:
                GetValue = def
        End Select
    End If
End Property

Public Property Get DataRows(Optional OptionUseRowMode As Boolean) As Long
Attribute DataRows.VB_Description = "Returns the row count that would be returned by the GetData method"
'   Returns the row count that would be returned by the GetData method.
'   The values are always +1 to account for the first row being keys.
'
'   OptionUseRowMode=True:  Returns the longest array size of values
'                           plus row for keys (if they exist).
'   OptionUseRowMode=False: Returns the count of the keys.
    DataRows = Iif(OptionUseRowMode, mLargestValueSize + LongMin(1, Me.Count), Me.Count)
End Property

Public Property Get DataCols(Optional OptionUseRowMode As Boolean) As Long
Attribute DataRows.VB_Description = "Returns the column count that would be returned by the GetData method."
'   Returns the column count that would be returned by the GetData method.
'   The values are always +1 to account for the first col being keys.
'
'   OptionUseRowMode=True:  Returns the count of the keys.
'   OptionUseRowMode=False: Returns the longest array size of values
'                           plus 1 col for keys (if they exist).
    DataCols = Iif(OptionUseRowMode, Me.Count, mLargestValueSize + LongMin(1, Me.Count))
End Property

Public Property Get NewEnum() As IUnknown
Attribute NewEnum.VB_Description = "Enables iteration with a For Each loop."
Attribute NewEnum.VB_UserMemId = -4
'   Enables iteration with a For Each loop.
    Set NewEnum = mBaseDict.[_NewEnum]
End Property


' Constructor
'-------------------------------------------------------------------------------
Private Sub Class_Initialize()
    Set mBaseDict = CreateObject("Scripting.Dictionary")
End Sub


' Methods
'-------------------------------------------------------------------------------
Public Sub Add(Key As Variant, Optional val As Variant = Nothing)
Attribute Add.VB_Description = "Adds a key and value pair to the dictionary."
'   Adds a key and value pair to the dictionary.
'
'   If the dictionary is in NoItemFail mode, and the key exists, the value
'   will be overwritten wrather than throwing a duplicate key exception.
'
'   Args:
'       Key: The key to add the value to.
'       val: The value to add.
'
    On Error Resume Next
    mBaseDict.Add Key, val

    Select Case True
        Case Is = Err = 457 And mOptionNoItemFail
            If IsObject(val) Then
                Set Item(Key) = val
            Else
                Item(Key) = val
            End If
        Case Is = Err = 457
            Err.Raise vbObjectError + 457, "Dictionary", _
                Key & " is already associated with the dictionary."
        Case Is = Err <> 0
            Err.Raise Err
        Case Else
            MetaTrackingAdd val
    End Select
End Sub

Public Sub Remove(Key As Variant)
Attribute Remove.VB_Description = "Removes a key from the Scripting.Dictionary."
'   Removes a key from the Scripting.Dictionary.
'
'   Args:
'       Key: The key to remove.
'
    Dim val As Variant
    If IsObject(Me.Item(Key)) Then
        Set val = Me.Item(Key)
    Else
        val = Me.Item(Key)
    End If
    mBaseDict.Remove Key
    MetaTrackingRemove val
End Sub

Public Sub RemoveAll()
Attribute RemoveAll.VB_Description = "Removes all keys from the dictionary."
'   Removes all keys from the dictionary.
'
    mBaseDict.RemoveAll
    mLargestValueSize = 0
End Sub

Public Sub AddBulk( _
    ValueArray2D As Variant, _
    Optional OptionUseRowMode As Boolean, _
    Optional OptionCountKeys As Boolean, _
    Optional DefaultValue As Variant, _
    Optional HeadersIndex As Long = 1)
Attribute AddBulk.VB_Description = "Adds key value pairs from a 2D array."
'   Adds key value pairs from a 2D array.
'
'   Supports keys as first row or firt column. Automatically detects array
'   size and adds values based on number of values per key.
'        0: Keys only (values are Nothing)
'        1: Single values only
'       >1: Values are a 1D array of values
'
'   Args:
'       ValueArray2D: The data to add to the dictionary.
'       OptionUseRowMode: Use the first row instead of column as keys.
'       OptionCountKeys: The value is the count of keys.
'       DefaultValue: Set a default item value.
'       HeadersIndex: Specify the header index or column.
'
'   Notes:
'       The use of OptionCountKeys implies duplicate keys so OptionNoItemFail
'       will be forced to True regardless of its current setting.
'
'       There is currently only support for 1-based arrays such that you would
'       get with a Range, e.g., Range("A1:B10").Value = (1 To 10, 1 To 2).
'
        ' Dictionary key
    Dim v As Variant    ' Dictionary value

    If OptionCountKeys Then mOptionNoItemFail = True

'   Transpose the array if we're using row mode so that we can use the same
'   logic to add bulk data to the dictionary (as if it is in column mode).
    If OptionUseRowMode Then
        ValueArray2D = Application.Transpose(ValueArray2D)
    End If

'   Set the shape of the data.   
    Dim rowCount As Long
    rowCount = UBound(ValueArray2D, 1)

    Dim colCount As Long
    colCount = UBound(ValueArray2D, 2)

'   Add the keys and values to the dictionary.
    Dim i As Long
    For i = 1 To rowCount
        Dim k As Variant
        k = ValueArray2D(i, HeadersIndex)

'       Determine the value and add it.
        Select Case True
            Case Is = OptionCountKeys:
                v = Me.GetValue(k, 0) + 1
            Case Is = colCount = 2:
                v = ValueArray2D(i, 2)
            Case Is = colCount > 2:
                v = GetDataValues(ValueArray2D, i, HeadersIndex)
            Case Else:
                If IsObject(DefaultValue) Then
                    Set v = DefaultValue
                Else
                    v = DefaultValue
                End If
        End Select
        Me.Add k, v
    Next i
End Sub

Public Function Exists(Key As Variant) As Boolean
Attribute Exists.VB_Description = "Checks if a key exists in the dictionary."
'   Checks if a key exists in the dictionary.
'
'   Args:
'       Key: The key to check.
'
'   Returns:
'       True if the key exists.
'
    Exists = mBaseDict.Exists(Key)
End Function

Public Function Items() As Variant()
Attribute Items.VB_Description = "Returns all values in the dictionary."
'   Returns all values in the dictionary.
'
'   Returns:
'       An array of values.
'
    Items = mBaseDict.Items
End Function

Public Function Keys() As Variant()
Attribute Keys.VB_Description = "Returns all keys in the dictionary."
'   Returns all keys in the dictionary.
'
'   Returns:
'       An array of keys.
'
    Keys = mBaseDict.Keys
End Function

Public Function GetData(Optional OptionUseRowMode As Boolean) As Variant
Attribute GetData.VB_Description = "Returns the dictionary data as a 2D array with keys representing headers."
'   Returns the dictionary data as a 2D array with keys representing headers.
'
'   Args:
'       OptionUseRowMode: Data is returned with keys as first column.
'
'   Returns:
'       A 2D array of keys and values. Arrays of values will be converted to
'       row data, or column data if OptionUseRowMode is True.
'
'   Set up the metadata to work with.
    Dim arrKeys As Variant
    arrKeys = mBaseDict.Keys()

    Dim arrVals As Variant
    arrVals = mBaseDict.Items()

    Dim dataRowCount As Long
    dataRowCount = Me.DataRows()

    Dim dataColCount As Long
    dataColCount = Me.DataCols()

'   Set up results array in the shape of the keys and values
'   adding an additional column to fit the keys as a column
    Dim results() As Variant
    ReDim results(1 To dataRowCount, _
        1 To dataColCount)

'   Populate the row(s) and column(s)
    Dim r As Long
    For r = 1 To dataRowCount
        results(r, 1) = arrKeys(r - 1)
        If dataColCount > 2 Then
'           Populate columns for multi-column
            Dim maxCols As Long
            maxCols = UBound(arrVals(r - 1)) + 2
            Dim c As Long
            For c = 2 To dataColCount
                results(r, c) = arrVals(r - 1)(c - 2)
                If c = maxCols Then Exit For
            Next c
        ElseIf dataColCount = 2 Then
'           Populate single value
            results(r, 2) = arrVals(r - 1)
        End If
    Next r

'   Return the data as normal or row mode.    
    If OptionUseRowMode Then
        GetData = Application.Transpose(results)
    Else
        GetData = results
    End If
End Function


' Helpers
'-------------------------------------------------------------------------------
Private Function GetDataValues(arr As Variant, rIdx As Long, hIdx As Long) As Variant
Attribute GetDataValues.VB_Description = "Returns a 1D array of values from the data."
'   Returns a 1D array of values from the data.
'
'   Args:
'       arr: The source array of values.
'       rIdx: The index row.
'       hIdx: The header (key) index.
'
'   Returns:
'       An array of values, minus the key.
'
    Dim result As Variant
    ReDim result(UBound(arr, 2) - 2)

    Dim i As Long
    For i = 1 To UBound(arr, 2)
        If i <> hIdx Then
            Result(i - IIf(i < hIdx, 1, 2)) = arr(rIdx, i)
        End If
    Next i

    GetDataValues = result
End Function

Private Function NArrayDimensions(arr As Variant) As Long
Attribute NArrayDimensions.VB_Description = "Returns the number of dimensions for the passed in array."
'   Returns the number of dimensions for the passed in array.
'
'   This is a hack that intentionally seeks to raise and catch an
'   exception as there is no property or elegant way to do this.
'
'   Args:
'       arr: The array to test.
'
'   Returns:
'       The number of dimensions for the passed in array.
'
'   Raises:
'

'   Test array dimensions until exception raised
    On Error GoTo Finally
    Dim i As Long
    Do
        i = i + 1
        NArrayDimensions = UBound(arr, i)
    Loop

Finally:
'   Expect to catch a Type mismatch exception.
'   Expect to catch a Subscript out of range exception.
    If Err = 13 Or Err = 9 Then NArrayDimensions = i - 1 Else Err.Raise Err
End Function

Private Sub MetaTrackingAdd(val As Variant)
Attribute MetaTrackingAdd.VB_Description = "Tracks the largest sized value array when adding a key to the dictionary."
'   Tracks the largest sized value array when adding a key to the dictionary.
'
'   Args:
'       val: The value being added.
'
    Dim valSize As Long
    valSize = GetValueOrArraySize(val)
    If valSize > mLargestValueSize Then
        mLargestValueSize = valSize
    End If
End Sub

Private Sub MetaTrackingRemove(remVal As Variant)
Attribute MetaTrackingRemove.VB_Description = "Tracks the largest sized value array when removing a key from the dictionary."
'   Tracks the largest sized value array when removing a key from the dictionary.
'
'   Args:
'       remVal: The value being removed.
'
'   Shortcut for when we have no values.
    If Count = 0 Then
        mLargestValueSize = 0
    End If

'   Get the count of the value array we're removing.
    Dim removedValSize As Long
    removedValSize = GetValueOrArraySize(remVal)

'   No need to test everything if the tracked value wasn't the largest.    
    If mLargestValueSize > removedValSize Then Exit Sub

    Dim val As Variant
    Dim valSize As Long
    mLargestValueSize = 0
    For Each val In Me.Items
        valSize = GetValueOrArraySize(val)

'       Shortcut if next largest is the same as value we're untracking.
        If valSize = removedValSize Then
            mLargestValueSize = valSize
            Exit Sub
        End If

        If valSize > mLargestValueSize Then
            mLargestValueSize = valSize
        End If
    Next val
End Sub

Private Function GetValueOrArraySize(val As Variant) As Long
Attribute GetValueOrArraySize.VB_Description = "Returns the length of the array, 1 if not an array, and 0 if Nothing."
'   Returns the length of the array, 1 if not an array, and 0 if Nothing.
'
'   Args:
'       val: The value or array to be tested.
'
'   Returns:
'       The count of values in an array, 1 if not an array, and 0 if Nothing.
'
'   Type checking like this prevents an exception if not an object.
    If TypeName(val) = "Nothing" Then Exit Function

    Dim dims As Long
    dims = NArrayDimensions(val)

    If dims = 0 Then
'       Not an array and not nothing.    
        GetValueOrArraySize = 1
    Else
'       Is an array, return the count.
'       Assumes a single dimension, but that's all we'll have here.
        GetValueOrArraySize = UBound(val) + 1
    End If
End Function

Private Function LongMin(a As Long, b As Long) As Long
Attribute LongMin.VB_Description = "Returns the smaller of the two passed in values."
'   Returns the smaller of the two passed in values.
'
'   Args:
'       a: A value to be tested.
'       b: A value to be tested.
'
'   Returns:
'       a if a is smaller, else b.
'
    LongMin = Iif(a < b, a, b)
End Function
