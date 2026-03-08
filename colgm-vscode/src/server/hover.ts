import {
    Hover,
    Position,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getWordAtPosition } from './utils';
import { typeDescriptions, keywordDescriptions } from './completions';
import { symbolDefinitions } from './symbols';

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

    // Check if it's a user-defined symbol
    const definitions = symbolDefinitions.get(document.uri);
    if (definitions) {
        const symbolDef = definitions.find(def => def.name === word);
        if (symbolDef) {
            const kindLabel = symbolDef.kind === 'func' ? 'func' :
                              symbolDef.kind === 'struct' ? 'struct' :
                              symbolDef.kind === 'enum' ? 'enum' :
                              symbolDef.kind === 'union' ? 'union' : '';

            const signature = symbolDef.signature || `${kindLabel} ${word}`;

            return {
                contents: {
                    kind: 'markdown',
                    value: [
                        '```colgm',
                        signature,
                        '```'
                    ].join('\n')
                }
            };
        }
    }

    return null;
}
