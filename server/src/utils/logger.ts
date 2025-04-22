import { inject, injectable } from 'tsyringe';
import { Logger, ILanguageServer } from '../injection/interface';
import { _Connection } from 'vscode-languageserver';


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

@injectable()
export class LspLogger implements Logger {
	constructor(
		@inject("_Connection") public connection: _Connection,
		@inject("ILanguageServer") private server: ILanguageServer) { }

	error = (msg: string, lvl?: number, e?: unknown) => this.emit(LogLevel.error, msg, lvl);
	warn = (msg: string, lvl?: number, e?: unknown) => this.emit(LogLevel.warn, msg, lvl);
	info = (msg: string, lvl?: number, e?: unknown) => this.emit(LogLevel.info, msg, lvl);
	log = (msg: string, lvl?: number, e?: unknown) => this.emit(LogLevel.log, msg, lvl);
	debug = (msg: string, lvl?: number, e?: unknown) => this.emit(LogLevel.debug, msg, lvl);
	stack = (e: Error, logLevel?: LogLevel) => this.emit(logLevel ?? LogLevel.error, `${e.name}: ${e.message}\n${e.stack}`);

	private emit(logLevel: LogLevel, msgText: string, msgLevel?: number, e?: unknown): void {
		// Async get the configuration and then emit.
		this.server.clientConfiguration.then(config => {
			try {
				// Get the configured log level or default to debug.
				const configLevel = config
					? LogLevel[config.logLevel.outputChannel.toLocaleLowerCase() as keyof typeof LogLevel]
					: LogLevel.debug;

				// Return without sending if log level is too high.
				if (logLevel > configLevel)
					return;

			} catch {
				// Advise we couldn't convert log level and deafult to debug.
				this.sendMessage(this.unableToConvertLogLevelMessage(config!.logLevel.outputChannel));
			}

			// If we got here then we should send the message.
			this.sendMessage({
				type: logLevel,
				message: msgText,
				level: msgLevel ?? 0
			});

			// If we have an error, then log stack trace too.
			if (e instanceof Error) {
				this.stack(e, logLevel);
			}
		});
	}

	private sendMessage = (message: LogMessage) =>
		this.connection.sendNotification(
			"window/logMessage",
			message
		);

	private unableToConvertLogLevelMessage = (level: string): LogMessage => ({
		type: LogLevel.error,
		message: `Unable to convert '${level}' to LogLevel`,
		level: 0
	});
}