import { TextDocument, Position } from 'vscode-languageserver-textdocument';

/**
 * Get word at a specific position in a document
 */
export function getWordAtPosition(document: TextDocument, position: Position): string | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Handle edge case: offset at or beyond text length
    if (offset >= text.length) {
        return null;
    }

    // Find word boundaries
    let start = offset;
    let end = offset;

    // Move start backward to find word beginning
    while (start > 0 && /[\w_]/.test(text[start - 1])) {
        start--;
    }

    // Move end forward to find word end
    while (end < text.length && /[\w_]/.test(text[end])) {
        end++;
    }

    // If start equals end, there's no word at this position
    if (start === end) {
        return null;
    }

    return text.substring(start, end);
}
