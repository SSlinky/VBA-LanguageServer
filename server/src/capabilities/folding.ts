import { FoldingRange as LSFoldingRange } from 'vscode-languageserver';
import { FoldableElement } from '../project/elements/special';

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


export class FoldingRange implements LSFoldingRange {
	/**
	 * The zero-based line number from where the folded range starts.
	 */
	startLine: number;

	/**
	 * The zero-based character offset from where the folded range starts. If not defined, defaults to the length of the start line.
	 */
	startCharacter?: number;

	/**
	 * The zero-based line number where the folded range ends.
	 */
	endLine: number;

	/**
	 * The zero-based character offset before the folded range ends. If not defined, defaults to the length of the end line.
	 */
	endCharacter?: number;

	/**
	 * Describes the kind of the folding range such as 'comment' or 'region'. The kind
	 * is used to categorize folding ranges and used by commands like 'Fold all comments'. See
	 * [FoldingRangeKind](#FoldingRangeKind) for an enumeration of standardized kinds.
	 */
	kind?: string;

	constructor(element: FoldableElement, foldingRangeKind?: FoldingRangeKind) {
		this.startLine = element.range.start.line;
		this.endLine = element.range.end.line;
		this.kind = foldingRangeKind;
	}
}