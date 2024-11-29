import { DuplicateDeclarationDiagnostic, ShadowDeclarationDiagnostic } from '../capabilities/diagnostics';
import { NamedSyntaxElement } from './elements/base';


export class NamespaceManager {
	private _names: Map<string, NamedSyntaxElement> = new Map();
	private _scopeStack: {namespace: NamedSyntaxElement, names: Map<string, NamedSyntaxElement> }[] = [];

	/**
	 * Begins tracking a namespace item against a namespace.
	 * @returns A diagnostic if the item has already been declared in this space.
	 */
	addNameItem = (item: NamedSyntaxElement): void => {
		// Check current scope for duplicate declaration.
		if (this._scopeStack.at(-1)?.names.has(item.name)) {
			item.diagnostics.push(new DuplicateDeclarationDiagnostic(item.range));
			return;
		}
		this._scopeStack.at(-1)?.names.set(item.name, item);

		// Check higher scopes for shadowed declarations
		if (this._names.has(item.name)) {
			item.diagnostics.push(new ShadowDeclarationDiagnostic(item.range));
			return;
		}
		this._names.set(item.name, item);
	}

	/**
	 * Adds a namespace to the stack and tracks names.
	 * @param scope The namespace to add.
	 */
	addNamespace = (scope: NamedSyntaxElement) => {
		this.addNameItem(scope); // a namespace is also a name
		this._scopeStack.push({namespace: scope, names: new Map()});
	}

	/**
	 * Removes the namespace and all names associated with it.
	 */
	popNamespace = (): void => {
		const ns = this._scopeStack.pop();

		// Remove the items in the current scope if they are not public.
		ns?.names.forEach((_, x) => {
			if (!(this._names.get(x)?.isPublic ?? true)) { this._names.delete(x); }
		});

		// Remove the current scope.
		if (ns && !ns.namespace.isPublic && this._names.has(ns.namespace.name)) {
			this._names.delete(ns.namespace.name);
		}
	}
}
