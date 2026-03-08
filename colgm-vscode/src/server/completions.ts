import {
    CompletionItem,
    CompletionItemKind,
} from 'vscode-languageserver/node';

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
 * Generate completion items for keywords and types
 */
export function generateCompletionItems(): CompletionItem[] {
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
}
