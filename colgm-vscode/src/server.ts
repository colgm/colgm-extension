import {
    createConnection,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
    CompletionItem,
    CompletionItemKind,
    Hover,
    Diagnostic,
    DiagnosticSeverity,
    Position,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Colgm language keywords
const keywords = [
    'func', 'struct', 'enum', 'match', 'impl', 'if', 'else', 'elsif',
    'for', 'foreach', 'forindex', 'while', 'return', 'break', 'continue',
    'var', 'pub', 'use', 'defer', 'and', 'or', 'nil', 'true', 'false'
];

// Colgm primitive types
const types = [
    'i8', 'i16', 'i32', 'i64',
    'u8', 'u16', 'u32', 'u64',
    'f32', 'f64',
    'bool', 'void', 'self'
];

// Type descriptions for hover
const typeDescriptions: Record<string, string> = {
    'i8': '8-bit signed integer',
    'i16': '16-bit signed integer',
    'i32': '32-bit signed integer',
    'i64': '64-bit signed integer',
    'u8': '8-bit unsigned integer',
    'u16': '16-bit unsigned integer',
    'u32': '32-bit unsigned integer',
    'u64': '64-bit unsigned integer',
    'f32': '32-bit floating point',
    'f64': '64-bit floating point',
    'bool': 'Boolean value (true or false)',
    'void': 'No return value',
    'self': 'Reference to current type',
    'nil': 'Null value',
    'true': 'Boolean true',
    'false': 'Boolean false'
};

// Keyword descriptions
const keywordDescriptions: Record<string, string> = {
    'func': 'Define a function',
    'struct': 'Define a struct type',
    'enum': 'Define an enum type',
    'match': 'Pattern matching expression',
    'impl': 'Implement methods for a type',
    'if': 'Conditional statement',
    'else': 'Alternative branch of conditional',
    'elsif': 'Else-if conditional branch',
    'for': 'Loop with counter or range',
    'foreach': 'Loop over collection elements',
    'forindex': 'Loop with index over collection',
    'while': 'Loop with condition',
    'return': 'Return from function',
    'break': 'Exit from loop',
    'continue': 'Continue to next iteration',
    'var': 'Declare a variable',
    'pub': 'Public visibility modifier',
    'use': 'Import a module',
    'defer': 'Defer execution until scope exit',
    'and': 'Logical AND operator',
    'or': 'Logical OR operator'
};

connection.onInitialize((params: InitializeParams): InitializeResult => {
    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Full,
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ['.', ':']
            },
            hoverProvider: true,
            definitionProvider: true,
            documentSymbolProvider: true,
        }
    };
    return result;
});

// Helper: Get word at position
function getWordAtPosition(document: TextDocument, position: Position): string | null {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: document.positionAt(document.offsetAt(position) + 1).character }
    });
    
    const text = document.getText();
    const offset = document.offsetAt(position);
    
    // Find word boundaries
    let start = offset;
    let end = offset;
    
    while (start > 0 && /[\w_]/.test(text[start - 1])) {
        start--;
    }
    while (end < text.length && /[\w_]/.test(text[end])) {
        end++;
    }
    
    if (start === end) {
        return null;
    }
    
    return text.substring(start, end);
}

// Completion handler
connection.onCompletion((params): CompletionItem[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const items: CompletionItem[] = [];

    // Add keyword completions
    for (const keyword of keywords) {
        items.push({
            label: keyword,
            kind: CompletionItemKind.Keyword,
            detail: 'Keyword',
            documentation: keywordDescriptions[keyword] || ''
        });
    }

    // Add type completions
    for (const type of types) {
        items.push({
            label: type,
            kind: CompletionItemKind.TypeParameter,
            detail: 'Primitive Type',
            documentation: typeDescriptions[type] || ''
        });
    }

    return items;
});

// Hover handler
connection.onHover((params): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    const word = getWordAtPosition(document, params.position);
    if (!word) {
        return null;
    }

    // Check if it's a type
    if (typeDescriptions[word]) {
        return {
            contents: {
                kind: 'plaintext',
                value: `**${word}**\n\n${typeDescriptions[word]}`
            }
        };
    }

    // Check if it's a keyword
    if (keywordDescriptions[word]) {
        return {
            contents: {
                kind: 'plaintext',
                value: `**${word}**\n\n${keywordDescriptions[word]}`
            }
        };
    }

    return null;
});

// Simple diagnostic provider - check for basic syntax issues
function validateTextDocument(document: TextDocument): void {
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

documents.onDidChangeContent((change): void => {
    validateTextDocument(change.document);
});

// Document symbol provider - extract functions, structs, enums
connection.onDocumentSymbol((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const symbols: any[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match function definitions
        const funcMatch = line.match(/\bfunc\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (funcMatch) {
            symbols.push({
                name: funcMatch[1],
                kind: 12, // Function
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length }
                },
                selectionRange: {
                    start: { line: i, character: line.indexOf(funcMatch[1]) },
                    end: { line: i, character: line.indexOf(funcMatch[1]) + funcMatch[1].length }
                }
            });
        }

        // Match struct definitions
        const structMatch = line.match(/\bstruct\s+([A-Z][a-zA-Z0-9_]*)/);
        if (structMatch) {
            symbols.push({
                name: structMatch[1],
                kind: 23, // Struct
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length }
                },
                selectionRange: {
                    start: { line: i, character: line.indexOf(structMatch[1]) },
                    end: { line: i, character: line.indexOf(structMatch[1]) + structMatch[1].length }
                }
            });
        }

        // Match enum definitions
        const enumMatch = line.match(/\benum\s+([A-Z][a-zA-Z0-9_]*)/);
        if (enumMatch) {
            symbols.push({
                name: enumMatch[1],
                kind: 21, // Enum
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length }
                },
                selectionRange: {
                    start: { line: i, character: line.indexOf(enumMatch[1]) },
                    end: { line: i, character: line.indexOf(enumMatch[1]) + enumMatch[1].length }
                }
            });
        }
    }

    return symbols;
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
