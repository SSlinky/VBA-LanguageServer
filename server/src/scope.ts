import { BaseDeclaration, BaseReference } from './parser/elements/memory/base';

class Project {
	names: Map<string, any> = new Map();
	scopes: Map<string, Scope> = new Map();

	constructor() {
		// Me should never be a scope name as it's reserved.
		this.scopes.set("Me", new Scope());
	}

	/**
	 * Attempts to find a project scope from the passed in namespace.
	 * @param namespace the namespace for the scope.
	 * @returns a project scope if found.
	 */
	getExplicitScope(namespace: string): Scope | undefined {

		return;
	}

	getImplicitScope(namespace: string): Scope {
		return this.scopes.get("Me")!;
	}

	addScopedDeclaration(element: BaseDeclaration) {
		// TODO: Declarations cannot override in VBA so a public / module level
		// 		 declaration that is redeclared anywhere (including method) is error.
		const ns = element.isPublic ? "Me" : element.namespace.replace(/\.\w+$/, "");
		const scope = this.scopes.get(ns);
		if(scope) {
			scope.addDeclaration(element);
		}
	}
}

class Scope {
	declarations: Map<string, BaseDeclaration[]> = new Map();
	undeclaredReferences: BaseReference[] = [];

	addDeclaration(element: BaseDeclaration) {
		const declarationName = element.identifierText;
	}

	addReference(element: BaseReference) {
		const declarations = this.declarations.get(element.identifierText);
		if(declarations) {
			declarations.forEach(declaration => {
				declaration.references.push(element);
			});
		}
		this.undeclaredReferences.push(element);
	}

	resolveReferences(globals: Map<string, BaseDeclaration[]>) {
		this.undeclaredReferences.forEach(ref => {
			const refName = ref.identifierText;
			const global = globals.get(refName);
			if(global) {
				// Only the first declaration matters.
				global[0].references.push(ref);
				ref.declarationElement = global[0];
			}
		});
	}
}

