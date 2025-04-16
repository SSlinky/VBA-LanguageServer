import { container, InjectionToken } from 'tsyringe';
import { Logger, IWorkspace, ILanguageServer } from './interface';
import { LspLogger } from '../utils/logger';
import { _Connection, createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { ScopeItemCapability } from '../capabilities/capabilities';
import { CodeActionsRegistry } from '../capabilities/codeActions';


export class Services {
	static registerServices(): void {
		container.registerSingleton("ILogger", LspLogger);
		container.registerInstance("_Connection", createConnection(ProposedFeatures.all));
		container.registerSingleton("CodeActions", CodeActionsRegistry);
	}

	static registerProjectScope(scope: ScopeItemCapability): void {
		container.registerInstance("ProjectScope", scope);
	}

	static registerServer(server: ILanguageServer): void {
		container.registerInstance("ILanguageServer", server);
	}

	static registerWorkspace<T extends IWorkspace>(workspace: InjectionToken<T>): void {
		container.registerSingleton("IWorkspace", workspace);
	}

	static get logger(): Logger {
		return container.resolve(LspLogger);
	}

	static get connection(): _Connection {
		return container.resolve("_Connection");
	}

	static get server(): ILanguageServer {
		return container.resolve("ILanguageServer");
	}

	static get codeActionsRegistry(): CodeActionsRegistry {
		return container.resolve("CodeActions");
	}

	static get projectScope(): ScopeItemCapability {
		return container.resolve("ProjectScope");
	}

	static get workspace(): IWorkspace {
		return container.resolve("IWorkspace");
	}
}