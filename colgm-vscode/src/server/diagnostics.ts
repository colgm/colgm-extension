import {
    Diagnostic,
    DiagnosticSeverity,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';

/**
 * Validate a text document and send diagnostics
 */
export function validateTextDocument(connection: Connection, document: TextDocument): void {
    const diagnostics: Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Check for unmatched braces
    let braceCount = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') braceCount++;
        if (text[i] === '}') braceCount--;
    }

    if (braceCount !== 0) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 }
            },
            message: `Unmatched braces: ${braceCount > 0 ? 'missing }' : 'extra }'}`,
            source: 'colgm'
        });
    }

    // Check for unmatched parentheses
    let parenCount = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '(') parenCount++;
        if (text[i] === ')') parenCount--;
    }

    if (parenCount !== 0) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 }
            },
            message: `Unmatched parentheses: ${parenCount > 0 ? 'missing )' : 'extra )'}`,
            source: 'colgm'
        });
    }

    // Check for empty struct/enum definitions
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\b(struct|enum)\s+\w+\s*\{\s*\}/.test(line)) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length }
                },
                message: 'Empty struct/enum definition',
                source: 'colgm'
            });
        }

        // Check for func without body
        if (/\bfunc\s+\w+\s*\([^)]*\)\s*(\{)?\s*$/.test(line) && !line.includes('{')) {
            // This is a forward declaration, which is ok
        }
    }

    connection.sendDiagnostics({ uri: document.uri, diagnostics });
}
