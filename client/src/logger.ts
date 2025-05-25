import * as vscode from 'vscode';
import { isExtensionInDebugMode } from './extension';

enum LogLevel {
	error = 1,
	warning = 2,
	info = 3,
	log = 4,
	debug = 5
}

export interface LogMessage {
	type: number;
	message: string;
	level: number;
}

export class VscodeLogger {
	private static _outputChannel: vscode.OutputChannel | undefined;
	private static get outputChannel(): vscode.OutputChannel {
		if (!VscodeLogger._outputChannel) {
			VscodeLogger.initialiseOutputChannel();
		}
		return VscodeLogger._outputChannel;
	}

	private static get configuredLevel(): LogLevel {
		const config = vscode.workspace.getConfiguration('vbaLanguageServer');
		const levelString = config.get<string>('logLevel.outputChannel', 'warning');
		return LogLevel[levelString as keyof typeof LogLevel];
	}

	static logMessage(params: LogMessage): void {
		this.log(params.type, params.message, params.level);
	}

	private static log(type: LogLevel, msg: string, lvl?: number): void {
		if (type > this.configuredLevel) return;

		const i = '> '.repeat(lvl ?? 0);
		const t = `${this.getFormattedTimestamp()}`;
		VscodeLogger.outputChannel.appendLine(`${t} [${LogLevel[type]}] ${i}${msg}`);
	}

	private static initialiseOutputChannel(): void {
		const channel = vscode.window.createOutputChannel('VBAPro Output');
		if (isExtensionInDebugMode) {
			channel.show();
		}
		VscodeLogger._outputChannel = channel;
	}

	private static getFormattedTimestamp(): string {
		const now = new Date();

		const year = now.getFullYear();
		const month = (now.getMonth() + 1).toString().padStart(2, "0");
		const day = now.getDate().toString().padStart(2, "0");

		const hours = now.getHours().toString().padStart(2, "0");
		const minutes = now.getMinutes().toString().padStart(2, "0");
		const seconds = now.getSeconds().toString().padStart(2, "0");
		const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
	}
}

