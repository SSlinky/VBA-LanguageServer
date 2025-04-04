import { Position, Range } from 'vscode';

export function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
	const start = new Position(sLine - 1, sChar);
	const end = new Position(eLine - 1, eChar);
	return new Range(start, end);
}