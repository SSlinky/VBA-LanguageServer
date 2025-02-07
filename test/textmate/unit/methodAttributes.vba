'  SYNTAX TEST "source.vba" "method attributes"

Public Function Identifier() As Variant
Attribute Identifier.VB_Description = "Docstring."
' <--------------------------------------------------	source.method.attribute.vba
' <---------											keyword.attribute.vba
'         ^^^^^^^^^^									entity.name.function.vba
'                   ^^^^^^^^^^^^^^^						support.variable.property.vba
'                                   ^					keyword.operator.assignment.vba
'                                     ^^^^^^^^^^^^		string.quoted.double.vba

Attribute Identifier.VB_UserMemId = 0
' <-------------------------------------	source.method.attribute.vba
' <---------								keyword.attribute.vba
'         ^^^^^^^^^^						entity.name.function.vba
'                   ^^^^^^^^^^^^^			support.variable.property.vba
'                                 ^ 		keyword.operator.assignment.vba
'                                   ^ 		constant.numeric.vba

End Function

Public Sub Identifier()
Attribute Identifier.VB_Description = "Docstring."
' <--------------------------------------------------	source.method.attribute.vba
' <--------- 											keyword.attribute.vba
'         ^^^^^^^^^^ 									entity.name.function.vba
'                   ^^^^^^^^^^^^^^^ 					support.variable.property.vba
'                                   ^ 					keyword.operator.assignment.vba
'                                     ^^^^^^^^^^^^ 		string.quoted.double.vba

Attribute Identifier.VB_UserMemId = 0
' <-------------------------------------	source.method.attribute.vba
' <--------- 								keyword.attribute.vba
'         ^^^^^^^^^^ 						entity.name.function.vba
'                   ^^^^^^^^^^^^^ 			support.variable.property.vba
'                                 ^ 		keyword.operator.assignment.vba
'                                   ^ 		constant.numeric.vba

End Sub

Public Property Let Identifier(var As PropertyType)
Attribute Identifier.VB_Description = "Docstring."
' <--------------------------------------------------	source.method.attribute.vba
' <--------- 											keyword.attribute.vba
'         ^^^^^^^^^^ 									entity.name.function.vba
'                   ^^^^^^^^^^^^^^^ 					support.variable.property.vba
'                                   ^ 					keyword.operator.assignment.vba
'                                     ^^^^^^^^^^^^ 		string.quoted.double.vba

Attribute Identifier.VB_UserMemId = 0
' <-------------------------------------	source.method.attribute.vba
' <--------- 								keyword.attribute.vba
'         ^^^^^^^^^^ 						entity.name.function.vba
'                   ^^^^^^^^^^^^^ 			support.variable.property.vba
'                                 ^ 		keyword.operator.assignment.vba
'                                   ^ 		constant.numeric.vba

End Property

Public Property Get Identifier() As PropertyType
Attribute Identifier.VB_Description = "Docstring."
' <--------------------------------------------------	source.method.attribute.vba
' <--------- 											keyword.attribute.vba
'         ^^^^^^^^^^ 									entity.name.function.vba
'                   ^^^^^^^^^^^^^^^ 					support.variable.property.vba
'                                   ^ 					keyword.operator.assignment.vba
'                                     ^^^^^^^^^^^^ 		string.quoted.double.vba

Attribute Identifier.VB_UserMemId = 0
' <-------------------------------------	source.method.attribute.vba
' <--------- 								keyword.attribute.vba
'         ^^^^^^^^^^ 						entity.name.function.vba
'                   ^^^^^^^^^^^^^ 			support.variable.property.vba
'                                 ^ 		keyword.operator.assignment.vba
'                                   ^ 		constant.numeric.vba

End Property

Public Property Let Identifier(var As PropertyType)
Attribute Identifier.VB_Description = "Docstring."
' <--------------------------------------------------	source.method.attribute.vba
' <--------- 											keyword.attribute.vba
'         ^^^^^^^^^^ 									entity.name.function.vba
'                   ^^^^^^^^^^^^^^^ 					support.variable.property.vba
'                                   ^ 					keyword.operator.assignment.vba
'                                     ^^^^^^^^^^^^ 		string.quoted.double.vba

Attribute Identifier.VB_UserMemId = 0
' <-------------------------------------	source.method.attribute.vba
' <--------- 								keyword.attribute.vba
'         ^^^^^^^^^^ 						entity.name.function.vba
'                   ^^^^^^^^^^^^^ 			support.variable.property.vba
'                                 ^ 		keyword.operator.assignment.vba
'                                   ^ 		constant.numeric.vba

End Property