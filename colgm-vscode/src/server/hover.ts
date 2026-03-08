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
            const kindLabel = symbolDef.kind === 'func' ? 'function' : 
                              symbolDef.kind === 'struct' ? 'struct' : 'enum';
            const locationInfo = `${symbolDef.uri.split('/').pop()}:${symbolDef.line + 1}`;
            
            return {
                contents: {
                    kind: 'markdown',
                    value: [
                        `**${word}**`,
                        '',
                        `Kind: \`${kindLabel}\``,
                        '',
                        `Location: \`${locationInfo}\``
                    ].join('\n')
                }
            };
        }
    }

    return null;
}
