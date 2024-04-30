import { BaseDeclaration } from '../elements/memory/base';


export class ScopeManager {
	language = "";


	/**
	* Initialises the VBA scopes at the language and application level.
	* @returns A scope with language and application initialised.
	*/
	initialiseScope(): Scope {
		return new VbaScope();
	}
}


/**
 * A scope represents a region of code that has a scope.
 * This can be a module or a method.
 */
class Scope {
	namespace: string;
	parent: Scope | undefined;

	constructor(namespace: string, parent: Scope | undefined) {
		this.namespace = namespace;
		this.parent = parent;
	}
}

class VbaScope extends Scope {
	globals: Map<string, string> = new Map();

	constructor() {
		super("vba", undefined);
	}
}

export class ScopeTable {
	// Items listed by their fully qualified name.
	definitions: Map<string, ScopeTableItem[]> = new Map();

	findDefinition(identifier:string, context: string)
		: ScopeTableItem | undefined {
			
		// Check fqns
		if(this.definitions.has(identifier)) {
			return this.definitions.get(identifier)[0];
		}
		
		// Check the project scope.
		let result = this.findDef(identifier, context);
		if(result) { return result; }

		// Check the application scope.
		result = this.findDef(identifier, 'Application');
		if(result) { return result; }

		// Check the language scope.
		result = this.findDef(identifier, 'Vba');
		if(result) { return result; }
	}

	private findDef(identifier:string, context: string)
		: ScopeTableItem | undefined {
		const names = context.split('.');
		while(names) {
			const checkDef = `${names.join('.')}.${identifier}`;
			if(this.definitions.has(checkDef)) {
				return this.definitions.get(checkDef)[0];
			}
			names.pop();
		}
	}
}


export interface ScopeTableItem {
	//namespace: string
	docstring: string
	reference: ScopeItem
	returnsAs: any
}

interface ScopeItem {
	args: string[]
	kwargs: Map<string, string>
}

/**
 * 
 * global
 *	 module
 *     method
 * language
 *   application
 */


 /**
  * When passed an identifier, need to find it.
  * There are a number of top level namespaces and
  * each may be the object itself.
  * 
    myProject.myModule.mySub.foo
	myProject.myModule.foo
	myProject.foo
	myProject.foo
	Application.foo
	Vba.foo

	Could be passed any part of the chain.
	e.g., myModule.a

	Therefore the resolver needs to first understand the context
	of the highest level calling object.

	It also needs to understand the context from where it's being called.
	e.g., finding `foo` from myFunc scope, the resolver must recursively
	walk up the scope tree to find a definition for foo:
	  - myProject.myModule.myFunc
	  - myProject.myModule
	  - myProject.otherModules (public definitions only)
	  -	myProject
	  - app
	  - lang
  */