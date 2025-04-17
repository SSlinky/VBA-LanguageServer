import * as fs from 'fs';
import * as path from 'path';
import { Services } from '../injection/services';
import { fileURLToPath, pathToFileURL } from 'url';

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

export function walk(uri: string, pattern?: RegExp, files?: Map<string, string>): Map<string, string>
export function walk(dir: string, pattern?: RegExp, files?: Map<string, string>): Map<string, string>
export function walk(dirOrUri: string, pattern?: RegExp, files: Map<string, string> = new Map()): Map<string, string> {
	Services.logger.debug(`Walking ${dirOrUri}`);
	const isUri = dirOrUri.startsWith('file://');
	const dir = isUri ? fileURLToPath(dirOrUri) : dirOrUri;

	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		if (fs.statSync(p).isDirectory()) {
			walk(p, pattern, files);
		} else if (pattern?.test(name) ?? true) {
			Services.logger.debug(`Found ${p}`, 1);
			files.set(isUri ? pathToFileURL(p).href : p, fs.readFileSync(p, 'utf-8'));
		}
	}
	return files;
}