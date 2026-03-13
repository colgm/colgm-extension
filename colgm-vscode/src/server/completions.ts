import {
    CompletionItem,
    CompletionItemKind,
    CompletionContext,
} from 'vscode-languageserver/node';
import { SymbolDefinition, getAllSymbolDefinitions, getMembersForType, getVariablesFromDocument, getAllVariables, MemberInfo, getAllMembers, getMembersByName, MemberDefinition } from './symbols';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver-textdocument';

/**
 * Colgm language keywords
 */
export const keywords = [
    'func', 'struct', 'enum', 'union', 'match', 'impl', 'if', 'else', 'elsif',
    'for', 'foreach', 'forindex', 'while', 'return', 'break', 'continue',
    'var', 'pub', 'use', 'defer', 'and', 'or', 'nil', 'true', 'false'
];

/**
 * Colgm primitive types
 */
export const types = [
    'i8', 'i16', 'i32', 'i64',
    'u8', 'u16', 'u32', 'u64',
    'f32', 'f64',
    'bool', 'void', 'self'
];

/**
 * Type descriptions for hover and completions
 */
export const typeDescriptions: Record<string, string> = {
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

/**
 * Keyword descriptions for hover and completions
 */
export const keywordDescriptions: Record<string, string> = {
    'func': 'Define a function',
    'struct': 'Define a struct type',
    'enum': 'Define an enum type',
    'union': 'Define a union type',
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

/**
 * Get the prefix expression before the cursor (for member completion)
 * Returns the identifier before '.', ':', or '->'
 */
function getPrefixExpression(document: TextDocument, position: Position, triggerChar: string): string | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Look backward from the position to find the identifier
    let start = offset - 1; // Start before the trigger character

    // For '->' trigger (triggered by '>')
    if (triggerChar === '>') {
        // Check if the previous character is '-'
        if (offset > 2 && text[offset - 2] === '-') {
            start = offset - 3; // Position before '-'
        } else {
            return null; // Not a '->' sequence, skip member completion
        }
    }

    // Skip any whitespace before the trigger character
    while (start >= 0 && /\s/.test(text[start])) {
        start--;
    }

    // Find the end of the identifier
    let end = start + 1;

    // Move backward to find the beginning of the identifier
    while (start >= 0 && /[\w_]/.test(text[start])) {
        start--;
    }

    // Move forward to find the end of the identifier
    while (end < text.length && /[\w_]/.test(text[end])) {
        end++;
    }

    if (start >= end) {
        return null;
    }

    return text.substring(start + 1, end);
}

/**
 * Generate member completion items for a type
 */
function generateMemberCompletions(typeName: string, parentKind?: string): CompletionItem[] {
    const items: CompletionItem[] = [];
    const members = getMembersForType(typeName);

    if (!members) {
        return items;
    }

    for (const member of members) {
        let kind: CompletionItemKind = CompletionItemKind.Field;
        if (parentKind === 'enum') {
            kind = CompletionItemKind.EnumMember;
        } else if (parentKind === 'union') {
            kind = CompletionItemKind.Class;
        }

        const detail = member.type ? `${member.name}: ${member.type}` : member.name;

        items.push({
            label: member.name,
            kind: kind,
            detail: detail,
            documentation: member.type ? `Type: ${member.type}` : undefined
        });
    }

    return items;
}

/**
 * Generate completion items for enum variants/union tags by member name (global lookup)
 */
function generateGlobalMemberCompletions(memberName: string): CompletionItem[] {
    const items: CompletionItem[] = [];
    const members = getMembersByName(memberName);

    for (const member of members) {
        let kind: CompletionItemKind = CompletionItemKind.Field;
        if (member.parentKind === 'enum') {
            kind = CompletionItemKind.EnumMember;
        } else if (member.parentKind === 'union') {
            kind = CompletionItemKind.Class;
        }

        const detail = member.type 
            ? `${member.name} (${member.parentKind} ${member.parentType}): ${member.type}`
            : `${member.name} (${member.parentKind} ${member.parentType})`;

        items.push({
            label: member.name,
            kind: kind,
            detail: detail,
            documentation: `Member of ${member.parentKind} ${member.parentType}`
        });
    }

    return items;
}

/**
 * Generate completion items for keywords, types, and global identifiers
 */
export function generateCompletionItems(
    document: TextDocument,
    position: Position,
    context?: CompletionContext
): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Check if triggered by '.', ':', or '->' for member completion
    if (context?.triggerCharacter === '.' ||
        context?.triggerCharacter === ':' ||
        context?.triggerCharacter === '>') {
        // For '>' trigger, only proceed if it's part of '->' sequence
        if (context.triggerCharacter === '>') {
            const text = document.getText();
            const offset = document.offsetAt(position);
            // Check if the previous character is '-'
            if (offset < 2 || text[offset - 2] !== '-') {
                // Not a '->' sequence, return empty to avoid unwanted completions
                return [];
            }
        }

        const prefix = getPrefixExpression(document, position, context.triggerCharacter);
        if (prefix) {
            // Try to find variable type
            const variables = getVariablesFromDocument(document.uri);
            const variable = variables.find(v => v.name === prefix);

            if (variable && variable.type) {
                const memberItems = generateMemberCompletions(variable.type);
                if (memberItems.length > 0) {
                    return memberItems;
                }
            }

            // If no variable found, try to find type directly
            const memberItems = generateMemberCompletions(prefix);
            if (memberItems.length > 0) {
                return memberItems;
            }
        }
    }

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

    // Add variable completions from current document
    const currentVariables = getVariablesFromDocument(document.uri);
    const seenNames = new Set<string>();

    for (const variable of currentVariables) {
        if (seenNames.has(variable.name)) {
            continue;
        }
        seenNames.add(variable.name);

        items.push({
            label: variable.name,
            kind: CompletionItemKind.Variable,
            detail: variable.type ? `var ${variable.name}: ${variable.type}` : `var ${variable.name}`,
            documentation: variable.type ? `Variable of type ${variable.type}` : 'Variable'
        });
    }

    // Add global member completions (enum variants, union tags)
    // This allows typing "None" or "Some" to show enum variants directly
    const allMembers = getAllMembers();
    const memberSeenNames = new Set<string>();

    for (const member of allMembers) {
        if (memberSeenNames.has(member.name)) {
            continue;
        }
        memberSeenNames.add(member.name);

        let kind: CompletionItemKind = CompletionItemKind.Field;
        if (member.parentKind === 'enum') {
            kind = CompletionItemKind.EnumMember;
        } else if (member.parentKind === 'union') {
            kind = CompletionItemKind.Class;
        }

        const detail = member.type 
            ? `${member.name} (${member.parentKind} ${member.parentType}): ${member.type}`
            : `${member.name} (${member.parentKind} ${member.parentType})`;

        items.push({
            label: member.name,
            kind: kind,
            detail: detail,
            documentation: `Member of ${member.parentKind} ${member.parentType}`
        });
    }

    // Add global identifier completions from all documents
    const allSymbols = getAllSymbolDefinitions();

    for (const symbol of allSymbols) {
        // Skip symbols from the current document to avoid duplicates with local scope
        if (symbol.uri === document.uri) {
            continue;
        }

        // Avoid duplicate names
        if (seenNames.has(symbol.name)) {
            continue;
        }
        seenNames.add(symbol.name);

        let kind: CompletionItemKind;
        let detail: string;

        switch (symbol.kind) {
            case 'func':
                kind = CompletionItemKind.Function;
                detail = symbol.signature || `func ${symbol.name}`;
                break;
            case 'struct':
                kind = CompletionItemKind.Struct;
                detail = symbol.signature || `struct ${symbol.name}`;
                break;
            case 'enum':
                kind = CompletionItemKind.Enum;
                detail = symbol.signature || `enum ${symbol.name}`;
                break;
            case 'union':
                kind = CompletionItemKind.Class;
                detail = symbol.signature || `union ${symbol.name}`;
                break;
            default:
                kind = CompletionItemKind.Text;
                detail = symbol.kind;
        }

        items.push({
            label: symbol.name,
            kind: kind,
            detail: detail,
            documentation: symbol.signature
        });
    }

    return items;
}
