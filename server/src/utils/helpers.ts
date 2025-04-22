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

/**
 * Recursively walks a directory structure and returns a map of file path to string content.
 * @param dirOrUri A directory as a path or 'file://' uri.
 * @param pattern A predicate to filter results.
 * @param files Used for internal recursive calls.
 * @param wasUriConverted Used for internal recursive calls.
 */
export function walk(uri: string, pattern?: RegExp, files?: Map<string, string>, wasUriConverted?: boolean): Map<string, string>
export function walk(dir: string, pattern?: RegExp, files?: Map<string, string>, wasUriConverted?: boolean): Map<string, string>
export function walk(dirOrUri: string, pattern?: RegExp, files: Map<string, string> = new Map(), wasUriConverted?: boolean): Map<string, string> {
	Services.logger.debug(`Walking ${dirOrUri}`);

	// Check whether the original directory was a dir or uri and convert as required.
	const shouldConvertUri = wasUriConverted || (wasUriConverted === undefined && dirOrUri.startsWith('file://'));
	const dir = (wasUriConverted === undefined && shouldConvertUri)
		? fileURLToPath(dirOrUri)
		: dirOrUri;

	// Walk the contents of the directory.
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);

		// Check if we have a directory. This can occasionally throw at an OS level.
		let pIsDirectory: boolean | undefined;
		try { pIsDirectory = fs.statSync(p).isDirectory(); }
		catch (e) {
			Services.logger.warn(`The OS threw an exception checking whether ${p} is a directory.`);
			if (e instanceof Error) {
				Services.logger.stack(e, true);
				continue;
			}
		}
		if (pIsDirectory) {
			// Recursive call for directories.
			walk(p, pattern, files, shouldConvertUri);
		} else if (pattern?.test(name) ?? true) {
			// Track files that match the pattern.
			Services.logger.debug(`Found ${p}`, 1);
			let fileContent = '';
			try { fileContent = fs.readFileSync(p, 'utf-8'); }
			catch (e) {
				Services.logger.error(`The OS threw an exception reading ${p}.`);
				if (e instanceof Error) {
					Services.logger.stack(e);
				}
			}
			files.set(shouldConvertUri ? pathToFileURL(p).href : p, fileContent);
		}
	}
	return files;
}