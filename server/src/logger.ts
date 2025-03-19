import { _Connection } from 'vscode-languageserver';

enum LogLevel {
	error = 1,
	warning = 2,
	info = 3,
	log = 4,
	debug = 5
}

export class LspLogger {
	private readonly connection: _Connection;

	constructor(connection: _Connection) {
		this.connection = connection;
	}

	error = (msg: string, lvl?: number) => this.emit(LogLevel.error, msg, lvl)
	warn = (msg: string, lvl?: number) => this.emit(LogLevel.warning, msg, lvl)
	info = (msg: string, lvl?: number) => this.emit(LogLevel.info, msg, lvl)
	log = (msg: string, lvl?: number) => this.emit(LogLevel.log, msg, lvl)
	debug = (msg: string, lvl?: number) => this.emit(LogLevel.debug, msg, lvl)
	stack = (e: Error) => this.emit(LogLevel.debug, `${e}\n${e.stack}`)

	private emit(msgType: LogLevel, msgText: string, msgLevel?: number): void {
		this.connection.sendNotification("window/logMessage", {
			type: msgType,
			message: msgText,
			level: msgLevel ?? 0
		})
	}
}