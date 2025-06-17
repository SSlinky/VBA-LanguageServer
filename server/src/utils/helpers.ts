// Core
import * as fs from 'fs';
import * as path from 'path';
import { Services } from '../injection/services';
import { pathToFileURL } from 'url';
import { Position, Range } from 'vscode-languageserver';

export class Dictionary<K, V> extends Map<K, V> {
	private defaultFactory: (...args: any) => V;

	constructor(defaultFactory: (...args: any) => V) {
		super();
		this.defaultFactory = defaultFactory;
	}

	/**
	 * Gets the value if the key exists or creates it in the dictionary if it does not.
	 */
	getOrSet(key: K, ...args: any): V {
		if (this.has(key)) return this.get(key)!;
		const defaultValue = this.defaultFactory(args);
		this.set(key, defaultValue);
		return defaultValue;
	}
}


export function isOfType<T>(obj: unknown, property: keyof T, nullable: boolean = true): obj is T {
	if (nullable) return (obj as T)[property] !== undefined;
	return (
		typeof obj === 'object'
		&& obj !== null
		&& property in obj
		&& (!!(obj as T)[property])
	);
}

export function ioEvents(): Promise<void> {
	return new Promise(resolve => setImmediate(resolve));
}

export function sleep(ms: number): Promise<unknown> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Recursively walks a directory structure and returns a map of file path to string content.
 * @param dirOrUri A directory as a path or 'file://' uri.
 * @param pattern A predicate to filter results.
 * @param files Used for internal recursive calls.
 */
export function walk(dirOrUri: string, pattern?: RegExp, files: Map<string, string> = new Map()): Map<string, string> {
	const logger = Services.logger;
	logger.debug(`Walking ${dirOrUri}`);

	// Walk the contents of the directory.
	const dir = dirOrUri.toFilePath();
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);

		// Check if we have a directory. This can occasionally throw at an OS level.
		let pIsDirectory: boolean | undefined;
		try { pIsDirectory = fs.statSync(p).isDirectory(); }
		catch (e) { logger.warn(`The OS threw an exception checking whether ${p} is a directory.`, 0, e); }
		if (pIsDirectory) {
			// Recursive call for directories.
			walk(p, pattern, files);
		} else if (pattern?.test(name) ?? true) {
			// Track files that match the pattern.
			logger.debug(`Found ${p}`, 1);
			logger.debug(`href: ${pathToFileURL(p).href}`);
			let fileContent = '';
			try { fileContent = fs.readFileSync(p, 'utf-8'); }
			catch (e) { logger.error(`The OS threw an exception reading ${p}.`, 0, e); }
			files.set(p, fileContent);
		}
	}
	return files;
}

export function isPositionInsideRange(position: Position, range: Range): boolean {
	if (range.start.line !== range.end.line) {
		return position.line >= range.start.line
			&& position.line <= range.end.line;
	}

	return position.line === range.start.line
		&& position.character >= range.start.character
		&& position.character <= range.end.character;
}

/**
 * Returns true if the inner range is inside the outer range.
 * @param inner The range to test as enveloped.
 * @param outer The range to test as enveloping.
 */
export function isRangeInsideRange(inner?: Range, outer?: Range): boolean {
	// Test we have ranges.
	if (!inner || !outer) {
		return false;
	}

	// Test characters on single-line ranges.
	const isSingleLine = inner.start.line === inner.end.line
		&& outer.start.line === outer.end.line
		&& inner.start.line === outer.start.line;
	if (isSingleLine) {
		return inner.start.character >= outer.start.character
			&& inner.end.character <= outer.end.character;
	}

	// Test lines on multi-line ranges.
	return inner.start.line >= outer.start.line
		&& inner.end.line <= outer.end.line;
}

export function rangeEquals(r1?: Range, r2?: Range): boolean {
	return !!r1 && !!r2
		&& r1.start.line === r2.start.line
		&& r1.start.character === r2.start.character
		&& r1.end.line === r2.end.line
		&& r1.end.character === r2.end.character;
}