import { Workspace } from '../project/workspace';

enum LogLevel {
	error = 1,
	warn = 2,
	info = 3,
	log = 4,
	debug = 5
}

type LogMessage = {
	type: number,
	message: string,
	level: number
}

export class LspLogger {
	private readonly workspace: Workspace;

	constructor(workspace: Workspace) {
		this.workspace = workspace;
	}

	error = (msg: string, lvl?: number) => this.emit(LogLevel.error, msg, lvl)
	warn = (msg: string, lvl?: number) => this.emit(LogLevel.warn, msg, lvl)
	info = (msg: string, lvl?: number) => this.emit(LogLevel.info, msg, lvl)
	log = (msg: string, lvl?: number) => this.emit(LogLevel.log, msg, lvl)
	debug = (msg: string, lvl?: number) => this.emit(LogLevel.debug, msg, lvl)
	stack = (e: Error) => this.emit(LogLevel.debug, `${e}\n${e.stack}`)

	private emit(logLevel: LogLevel, msgText: string, msgLevel?: number): void {
		// Async get the configuration and then emit.
		this.workspace.extensionConfiguration.then(config => {
			try {
				// Get the configured log level or default to debug.
				const configLevel = !!config
					? LogLevel[config.logLevel.outputChannel.toLocaleLowerCase() as keyof typeof LogLevel]
					: LogLevel.debug

				// Return without sending if log level is too high.
				if (logLevel > configLevel)
					return;

			} catch {
				// Advise we couldn't convert log level and deafult to debug.
				this.workspace.connection.sendNotification("window/logMessage",
					this.unableToConvertMessage(config!.logLevel.outputChannel)
				);
			}

			// If we got here then we should send the message.
			this.workspace.connection.sendNotification("window/logMessage", {
				type: logLevel,
				message: msgText,
				level: msgLevel ?? 0
			});
		})
	}

	private unableToConvertMessage = (level: string): LogMessage => ({
		type: 1,
		message: `Unable to convert logLevel.outputChannel: '${level}' to log level.`,
		level: 0
	})
}