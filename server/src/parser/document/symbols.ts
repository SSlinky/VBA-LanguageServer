
/**
 * A data class representing a method, function, or variable.
 */
class VbaSymbol {
	scope: string;
	name: string;

	constructor(scope: string, name: string, ) {
		this.scope = scope;
		this.name = name;
	}
}

class VbaReference extends VbaSymbol {
	declaration: VbaSymbol;

	constructor(scope: string, name: string, declaration: VbaSymbol) {
		super(scope, name);
		this.declaration = declaration;
	}
}