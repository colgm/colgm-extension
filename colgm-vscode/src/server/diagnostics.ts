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
    }

    connection.sendDiagnostics({ uri: document.uri, diagnostics });
}
