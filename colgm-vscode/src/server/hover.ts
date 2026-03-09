import {
    Hover,
    Position,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getWordAtPosition } from './utils';
import { typeDescriptions, keywordDescriptions } from './completions';
import { symbolDefinitions, getAllSymbolDefinitions, MemberInfo } from './symbols';

/**
 * Format members for hover display
 */
function formatMembers(members: MemberInfo[], kind: string): string {
    if (!members || members.length === 0) {
        return '';
    }

    const lines: string[] = [];
    
    if (kind === 'enum') {
        // Enum variants
        for (const member of members) {
            if (member.type) {
                lines.push(`  ${member.name}(${member.type})`);
            } else {
                lines.push(`  ${member.name}`);
            }
        }
    } else {
        // Struct/union fields
        for (const member of members) {
            if (member.type) {
                lines.push(`  ${member.name}: ${member.type}`);
            } else {
                lines.push(`  ${member.name}`);
            }
        }
    }

    return lines.join('\n');
}

/**
 * Get hover information for a position in the document
 */
export function getHover(document: TextDocument, position: Position): Hover | null {
    const word = getWordAtPosition(document, position);
    if (!word) {
        return null;
    }

    // Check if it's a type
    if (typeDescriptions[word]) {
        return {
            contents: {
                kind: 'markdown',
                value: `**${word}**\n\n${typeDescriptions[word]}`
            }
        };
    }

    // Check if it's a keyword
    if (keywordDescriptions[word]) {
        return {
            contents: {
                kind: 'markdown',
                value: `**${word}**\n\n${keywordDescriptions[word]}`
            }
        };
    }

    // Check if it's a user-defined symbol (search across all documents)
    const allDefinitions = getAllSymbolDefinitions();
    const symbolDef = allDefinitions.find(def => def.name === word);
    if (symbolDef) {
        const kindLabel = symbolDef.kind === 'func' ? 'func' :
                          symbolDef.kind === 'struct' ? 'struct' :
                          symbolDef.kind === 'enum' ? 'enum' :
                          symbolDef.kind === 'union' ? 'union' : '';

        const signature = symbolDef.signature || `${kindLabel} ${word}`;

        let hoverContent = signature;

        // Add members for struct/enum/union
        if (symbolDef.members && symbolDef.members.length > 0) {
            const membersContent = formatMembers(symbolDef.members, symbolDef.kind);
            if (membersContent) {
                hoverContent += ' {\n' + membersContent + '\n}';
            }
        }

        return {
            contents: {
                kind: 'markdown',
                value: [
                    '```colgm',
                    hoverContent,
                    '```'
                ].join('\n')
            }
        };
    }

    return null;
}
