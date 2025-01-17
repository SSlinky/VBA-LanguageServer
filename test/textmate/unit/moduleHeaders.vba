'  SYNTAX TEST "source.vba" "module headers"

Attribute VB_Name = "ModuleName"
' <-------------------------------	meta.attribute.vba 
' <---------                        keyword.attribute.vba
'         ^^^^^^^					entity.other.attribute-name.vba
'                 ^ 				keyword.operator.comparison.vba
'                   ^^^^^^^^^^^^ 	string.quoted.double.vba

Option Explicit
' <--------------- keyword.control.vba