// Core
import { fileURLToPath, pathToFileURL } from "url";

declare global {
	interface String {
		stripQuotes(): string;
		toFilePath(): string;
		toFileUri(): string;
	}
}

String.prototype.stripQuotes = function (): string {
	const exp = /^"?(.*?)"?$/;
	return exp.exec(this.toString())![1];
};

String.prototype.toFilePath = function (): string {
	return this.startsWith('file://')
		? fileURLToPath(this.toString())
		: this.toString();
};

String.prototype.toFileUri = function (): string {
	return !this.startsWith('file://')
		? pathToFileURL(this.toString()).href
		: this.toString();
};
