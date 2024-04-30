

export class Primative {

}

export class Struct {
	name: string;
	type: Struct | Primative;

	constructor(name: string, type: Struct | Primative) {
		this.name = name;
		this.type = type;
	}
}

export class TypeRegister {
	registeredTypes: Map<string, Struct[]>;

	constructor() {
		this.registeredTypes = new Map<string, Struct[]>();
	}
}