// Core
import { Diagnostic } from 'vscode-languageserver';

// Project
import { DeclarableElement } from './elements/base';
import { DuplicateDeclarationDiagnostic, ShadowDeclarationDiagnostic } from '../capabilities/diagnostics';


export class NamespaceManager {
	private names: Map<string, DeclarableElement> = new Map();
	private scopeStack: {namespace: DeclarableElement, names: Map<string, DeclarableElement> }[] = [];

	/**
	 * Begins tracking a namespace item against a namespace.
	 * @returns A diagnostic if the item has already been declared in this space.
	 */
	addNameItem = (item: DeclarableElement): void => {
		const pushDiagnostic = (x: Diagnostic) => item.diagnosticCapability.diagnostics.push(x);

		// Check current scope for duplicate declaration.
		let checkItem = this.scopeStack.at(-1)?.names.get(item.identifierCapability.name);
		if (!!checkItem && !checkItem.equals(item)) {
			pushDiagnostic(new DuplicateDeclarationDiagnostic(item.identifierCapability.range));
			return;
		}

		// Add the name to the current scope.
		this.scopeStack.at(-1)?.names.set(item.identifierCapability.name, item);

		// Check higher scopes for shadowed declarations
		checkItem = this.names.get(item.identifierCapability.name)
		if (!!checkItem && !checkItem.equals(item)) {
			pushDiagnostic(new ShadowDeclarationDiagnostic(item.context.range));
			return;
		}
		this.names.set(item.identifierCapability.name, item);
	}

	/**
	 * Adds a namespace to the stack and tracks names.
	 * @param scope The namespace to add.
	 */
	addNamespace = (scope: DeclarableElement) => {
		this.addNameItem(scope); // a namespace is also a name
		this.scopeStack.push({namespace: scope, names: new Map()});
	}

	/**
	 * Removes the namespace and all names associated with it.
	 */
	popNamespace = (): void => {
		const ns = this.scopeStack.pop();

		// Remove the items in the current scope if they are not public.
		ns?.names.forEach((_, x) => {
			if (!(this.names.get(x)?.isPublic ?? true)) { this.names.delete(x); }
		});

		// Remove the current scope.
		if (ns && !ns.namespace.isPublic && this.names.has(ns.namespace.identifierCapability.name)) {
			this.names.delete(ns.namespace.identifierCapability.name);
		}
	}
}
