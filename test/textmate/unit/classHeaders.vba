'  SYNTAX TEST "source.vba" "class headers"


VERSION 1.0 CLASS
' <---------------- 	entity.other.attribute-name.block.vba
'       ^^^ 			constant.numeric.vba

BEGIN
' <----- entity.other.attribute-name.block.vba

   MultiUse = -1  'True
'  ^^^^^^^^^^^^^^^^^^^^ entity.other.attribute-name.block.vba
'  ^^^^^^^^ 				support.variable.property.vba
'           ^			   keyword.operator.assignment.vba
'             ^^ 		   constant.numeric.vba
'                 ^^^^^ comment.line.apostrophe.vba

END
' <--- entity.other.attribute-name.block.vba

Attribute VB_Name = "ClassName"
' <------------------------------	meta.attribute.vba
' <---------                        keyword.attribute.vba
'         ^^^^^^^ 				      support.variable.property.vba
'                 ^ 				      keyword.operator.assignment.vba
'                   ^^^^^^^^^^^		string.quoted.double.vba

Attribute VB_Description = "Class description goes here"
' <-------------------------------------------------------	meta.attribute.vba
' <---------                                                keyword.attribute.vba
'         ^^^^^^^^^^^^^^ 									         support.variable.property.vba
'                        ^ 									      keyword.operator.assignment.vba
'                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^	   string.quoted.double.vba

Attribute VB_GlobalNameSpace = False
' <-----------------------------------	meta.attribute.vba
' <---------                           keyword.attribute.vba
'         ^^^^^^^^^^^^^^^^^^			   support.variable.property.vba
'                            ^ 			keyword.operator.assignment.vba
'                              ^^^^^	constant.language.boolean.vba

Attribute VB_Creatable = False
' <-----------------------------	meta.attribute.vba
' <---------                     keyword.attribute.vba
'         ^^^^^^^^^^^^				support.variable.property.vba
'                      ^ 			keyword.operator.assignment.vba
'                        ^^^^^	constant.language.boolean.vba

Attribute VB_PredeclaredId = False
' <---------------------------------	meta.attribute.vba
' <---------                           keyword.attribute.vba
'         ^^^^^^^^^^^^^^^^			      support.variable.property.vba
'                          ^ 			   keyword.operator.assignment.vba
'                            ^^^^^		constant.language.boolean.vba

Attribute VB_Exposed = False
' <---------------------------	meta.attribute.vba
' <---------                     keyword.attribute.vba
'         ^^^^^^^^^^			      support.variable.property.vba
'                    ^ 			   keyword.operator.assignment.vba
'                      ^^^^^	   constant.language.boolean.vba

Option Explicit
' <--------------- keyword.control.vba