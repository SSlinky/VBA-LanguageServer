// Core
import { FoldingRange as VscFoldingRange, Range } from 'vscode-languageserver';

/**
 * Enum of known range kinds
 * ~~ https://github.com/microsoft/vscode-languageserver-protocol-foldingprovider/blob/master/protocol.foldingProvider.md
 */
export enum FoldingRangeKind {
	/**
	 * Folding range for a comment
	 */
	Comment = 'comment',
	/**
	 * Folding range for a imports or includes
	 */
	Imports = 'imports',
	/**
	 * Folding range for a region (e.g. `#region`)
	 */
	Region = 'region'
}


export class FoldingRange implements VscFoldingRange {
	/**
	 * The zero-based line number from where the folded range starts.
	 */
	get startLine(): number {
		return this._range.start.line;
	}

	/**
	 * The zero-based line number where the folded range ends.
	 */
	get endLine(): number {
		return this._range.end.line;
	}

	/**
	 * Describes the kind of the folding range such as 'comment' or 'region'. The kind
	 * is used to categorize folding ranges and used by commands like 'Fold all comments'. See
	 * [FoldingRangeKind](#FoldingRangeKind) for an enumeration of standardized kinds.
	 */
	get kind(): string | undefined {
		return this._foldingRangeKind;
	}

	get openWord(): string {
		return this._openWord ?? '';
	}

	get closeWord(): string {
		return this._closeWord ?? '';
	}

	get range() {
		return {
			startLine: this.startLine,
			endLine: this.endLine
		};
	}

	constructor(
		private _range: Range,
		private _foldingRangeKind?: FoldingRangeKind,
		private _openWord?: string,
		private _closeWord?: string) { }
}