import '.';

declare global {
	export interface String {
		stripQuotes(): string;
	}
}

String.prototype.stripQuotes = function (): string {
	const exp = /^"?(.*?)"?$/;
	return exp.exec(this.toString())![1];
};
