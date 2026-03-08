import {
    TextDocument,
    Position,
} from 'vscode-languageserver-textdocument';
import {
    Location,
    DocumentSymbol,
    SymbolKind,
    TextDocuments,
} from 'vscode-languageserver/node';
import { getWordAtPosition } from './utils';

/**
 * Member/field information for struct/enum/union
 */
export interface MemberInfo {
    name: string;
    type?: string;
    value?: string;
}

/**
 * Symbol definition interface
 */
export interface SymbolDefinition {
    name: string;
    uri: string;
    line: number;
    character: number;
    kind: string;
    signature?: string;  // Full signature for hover display
    members?: MemberInfo[];  // Members for struct/enum/union
}

/**
 * Store symbol definitions for go-to-definition
 */
export const symbolDefinitions: Map<string, SymbolDefinition[]> = new Map();

/**
 * Parse members from struct/enum/union body
 */
function parseMembers(lines: string[], startLine: number, kind: string): MemberInfo[] {
    const members: MemberInfo[] = [];
    let braceCount = 0;
    let started = false;

    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();

        // Count braces to find the end of the definition
        for (const char of line) {
            if (char === '{') {
                braceCount++;
                started = true;
            } else if (char === '}') {
                braceCount--;
            }
        }

        if (!started) continue;

        // Skip the opening line with just '{'
        if (line === '{' || line.endsWith('{')) continue;
        if (line === '}') break;

        // Parse enum variant: `Case(Type)` or `Case`
        if (kind === 'enum') {
            const enumVariantMatch = line.match(/^([A-Z][a-zA-Z0-9_]*)\s*(?:\(([^)]*)\))?/);
            if (enumVariantMatch) {
                members.push({
                    name: enumVariantMatch[1],
                    type: enumVariantMatch[2] || undefined
                });
            }
            continue;
        }

        // Struct/union field: `name: Type` or `pub name: Type`
        const fieldMatch = line.match(/^(?:pub\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?),?\s*$/);
        if (fieldMatch) {
            members.push({
                name: fieldMatch[1],
                type: fieldMatch[2].trim()
            });
        }
    }

    return members;
}

/**
 * Build symbol definitions from a document
 */
export function buildSymbolDefinitions(document: TextDocument): void {
    const text = document.getText();
    const lines = text.split('\n');
    const definitions: SymbolDefinition[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match function definitions: func name(params) -> ReturnType or func name(params)
        const funcMatch = line.match(/\bfunc\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([a-zA-Z_][a-zA-Z0-9_]*))?/);
        if (funcMatch) {
            const funcName = funcMatch[1];
            const params = funcMatch[2];
            const returnType = funcMatch[3];
            const signature = `func ${funcName}(${params})${returnType ? ' -> ' + returnType : ''}`;

            definitions.push({
                name: funcName,
                uri: document.uri,
                line: i,
                character: line.indexOf(funcName),
                kind: 'func',
                signature: signature
            });
        }

        // Match struct definitions: struct Name { ... }
        const structMatch = line.match(/\bstruct\s+([A-Z][a-zA-Z0-9_]*)\s*\{/);
        if (structMatch) {
            const structName = structMatch[1];
            const members = parseMembers(lines, i, 'struct');
            definitions.push({
                name: structName,
                uri: document.uri,
                line: i,
                character: line.indexOf(structName),
                kind: 'struct',
                signature: `struct ${structName}`,
                members: members
            });
        }

        // Match enum definitions: enum Name { ... }
        const enumMatch = line.match(/\benum\s+([A-Z][a-zA-Z0-9_]*)\s*\{/);
        if (enumMatch) {
            const enumName = enumMatch[1];
            const members = parseMembers(lines, i, 'enum');
            definitions.push({
                name: enumName,
                uri: document.uri,
                line: i,
                character: line.indexOf(enumName),
                kind: 'enum',
                signature: `enum ${enumName}`,
                members: members
            });
        }

        // Match union definitions: pub union(type) Name { ... } or union(type) Name { ... }
        const unionMatch = line.match(/\b(?:pub\s+)?union\s*\(([^)]*)\)\s*([A-Z][a-zA-Z0-9_]*)\s*\{/);
        if (unionMatch) {
            const unionType = unionMatch[1];
            const unionName = unionMatch[2];
            const members = parseMembers(lines, i, 'union');
            definitions.push({
                name: unionName,
                uri: document.uri,
                line: i,
                character: line.indexOf(unionName),
                kind: 'union',
                signature: `union(${unionType}) ${unionName}`,
                members: members
            });
        }
    }

    symbolDefinitions.set(document.uri, definitions);
}

/**
 * Find definition at position
 */
export function findDefinition(
    documents: TextDocuments<TextDocument>,
    position: Position,
    uri: string
): Location[] | null {
    const document = documents.get(uri);
    if (!document) {
        return null;
    }

    const word = getWordAtPosition(document, position);
    if (!word) {
        return null;
    }

    // Search through all symbol definitions
    const locations: Location[] = [];
    for (const definitions of symbolDefinitions.values()) {
        for (const def of definitions) {
            if (def.name === word) {
                locations.push({
                    uri: def.uri,
                    range: {
                        start: { line: def.line, character: def.character },
                        end: { line: def.line, character: def.character + def.name.length }
                    }
                });
            }
        }
    }

    return locations.length > 0 ? locations : null;
}

/**
 * Get document symbols (functions, structs, enums)
 */
export function getDocumentSymbols(document: TextDocument): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match function definitions
        const funcMatch = line.match(/\bfunc\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (funcMatch) {
            symbols.push({
                name: funcMatch[1],
                kind: SymbolKind.Function,
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
                kind: SymbolKind.Struct,
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
                kind: SymbolKind.Enum,
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
}
