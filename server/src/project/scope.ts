import { DeclarationElement } from './elements/base';


interface IScope {
	children: IScope[];
	declaredNames: Map<string, DeclarationElement[]>;
	pushDeclaredName(element: DeclarationElement): void
	findDeclaration(identifier: string): DeclarationElement | undefined;
}

abstract class BaseScope implements IScope {
	children: IScope[] = [];
	parentScope?: IScope;
	declaredNames: Map<string, DeclarationElement[]> = new Map();

	abstract findDeclaration(identifier: string): DeclarationElement | undefined;

	pushDeclaredName(element: DeclarationElement): void {
		const name = element.name;
		const names: DeclarationElement[] = this.declaredNames.get(name) ?? [];
		names.push(element);
		this.declaredNames.set(name, names);
	}
}

export class Scope extends BaseScope {
	parentScope: Scope | GlobalScope;

	constructor(parent: Scope | GlobalScope) {
		super();
		this.parentScope = parent;
	}

	/**
	 * Recursively searches for the related declaration.
	 * @param identifier the name of the identifiable element.
	 * @returns a declaration element if found.
	 */
	findDeclaration = (identifier: string): DeclarationElement | undefined =>
		this.declaredNames.get(identifier)?.at(0) ?? this.parentScope?.findDeclaration(identifier);
}

export class GlobalScope extends BaseScope {
	constructor() {
		super();
	}

	findDeclaration = (identifier: string) =>
		this.declaredNames.get(identifier)?.at(0);
}
