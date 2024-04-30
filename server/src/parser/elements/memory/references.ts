import { BaseDeclaration, BaseReference } from './base';


export class MethodCallReferenceElement extends BaseReference {
	name = "MethodCallReferenceElement";
}


export class VariableReferenceElement extends BaseReference {
	name = "VariableReferenceElement";
}


export class LiteralReferenceElement extends BaseReference {
	name = "LiteralReferenceElement";
}

class LiteralDeclarationMockElement extends BaseDeclaration {
	name = "LiteralDeclarationMockElement";
}