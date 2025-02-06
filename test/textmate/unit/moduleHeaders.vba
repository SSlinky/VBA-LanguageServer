'  SYNTAX TEST "source.vba" "module headers"

Attribute VB_Name = "ModuleName"
' <-------------------------------	meta.attribute.vba 
' <---------                        keyword.attribute.vba
'         ^^^^^^^					support.variable.property.vba
'                 ^ 				keyword.operator.assignment.vba
'                   ^^^^^^^^^^^^ 	string.quoted.double.vba

Option Explicit
' <--------------- keyword.control.vba