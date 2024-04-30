import { BaseDeclaration, Visibility } from './base';



export class EventDeclarationElement extends BaseDeclaration {
	name = "EventDeclarationElement";
	visibility = Visibility.Public;
	// Public Event OnNewLine(pos As Long)
}

export class EventMethodDeclarationElement extends BaseDeclaration {
	name = "EventMethodDeclarationElement";
	visibility = Visibility.Public;
	// Acts as both a reference and a declaration.
	// Should reference the WithEvents variable.

	// Private WithEvents myRaiser As EventRaiser
	// Private Sub myRaiser_OnNewLine(pos As Long)
}