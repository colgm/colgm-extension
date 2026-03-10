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
 * Variable information
 */
export interface VariableInfo {
    name: string;
    type?: string;
    uri: string;
    line: number;
    character: number;
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
 * Store variable definitions for completions
 */
export const variableDefinitions: Map<string, VariableInfo[]> = new Map();

/**
 * Get members for a specific type name
 */
export function getMembersForType(typeName: string): MemberInfo[] | undefined {
    // Remove reference modifier if present
    const cleanTypeName = typeName.replace(/^&/, '').trim();
    
    for (const definitions of symbolDefinitions.values()) {
        for (const def of definitions) {
            if (def.name === cleanTypeName && def.members) {
                return def.members;
            }
        }
    }
    return undefined;
}

/**
 * Get all variables from current document
 */
export function getVariablesFromDocument(uri: string): VariableInfo[] {
    return variableDefinitions.get(uri) || [];
}

/**
 * Get all variables from all documents
 */
export function getAllVariables(): VariableInfo[] {
    const allVariables: VariableInfo[] = [];
    for (const variables of variableDefinitions.values()) {
        allVariables.push(...variables);
    }
    return allVariables;
}

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
    const variables: VariableInfo[] = [];

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
        // Support both uppercase and lowercase starting letters
        const structMatch = line.match(/\bstruct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/);
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
        // Support both uppercase and lowercase starting letters
        const enumMatch = line.match(/\benum\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/);
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
        // Support both uppercase and lowercase starting letters
        const unionMatch = line.match(/\b(?:pub\s+)?union\s*\(([^)]*)\)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/);
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

        // Match variable definitions: var name: Type = value or pub var name: Type = value
        const varWithTypeMatch = line.match(/\b(?:pub\s+)?var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (varWithTypeMatch) {
            variables.push({
                name: varWithTypeMatch[1],
                type: varWithTypeMatch[2],
                uri: document.uri,
                line: i,
                character: line.indexOf(varWithTypeMatch[1])
            });
        }

        // Match local variable without explicit type: var name = value
        const varWithoutTypeMatch = line.match(/\b(?:pub\s+)?var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/);
        if (varWithoutTypeMatch && !varWithTypeMatch) {
            variables.push({
                name: varWithoutTypeMatch[1],
                type: undefined,
                uri: document.uri,
                line: i,
                character: line.indexOf(varWithoutTypeMatch[1])
            });
        }

        // Match function parameter variables: func name(param: Type)
        if (funcMatch) {
            const params = funcMatch[2];
            const paramMatches = params.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)/g);
            for (const paramMatch of paramMatches) {
                variables.push({
                    name: paramMatch[1],
                    type: paramMatch[2],
                    uri: document.uri,
                    line: i,
                    character: line.indexOf(paramMatch[1])
                });
            }
        }
    }

    symbolDefinitions.set(document.uri, definitions);
    variableDefinitions.set(document.uri, variables);
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

    // Search through variable definitions
    for (const variables of variableDefinitions.values()) {
        for (const variable of variables) {
            if (variable.name === word) {
                locations.push({
                    uri: variable.uri,
                    range: {
                        start: { line: variable.line, character: variable.character },
                        end: { line: variable.line, character: variable.character + variable.name.length }
                    }
                });
            }
        }
    }

    return locations.length > 0 ? locations : null;
}

/**
 * Get all symbol definitions across all documents
 */
export function getAllSymbolDefinitions(): SymbolDefinition[] {
    const allDefinitions: SymbolDefinition[] = [];
    for (const definitions of symbolDefinitions.values()) {
        allDefinitions.push(...definitions);
    }
    return allDefinitions;
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

        // Match struct definitions (support both uppercase and lowercase)
        const structMatch = line.match(/\bstruct\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
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

        // Match enum definitions (support both uppercase and lowercase)
        const enumMatch = line.match(/\benum\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
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
