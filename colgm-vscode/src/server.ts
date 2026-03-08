import {
    createConnection,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { generateCompletionItems } from './server/completions';
import { validateTextDocument } from './server/diagnostics';
import { getHover } from './server/hover';
import { buildSymbolDefinitions, findDefinition, getDocumentSymbols } from './server/symbols';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

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

// Completion handler
connection.onCompletion((params): ReturnType<typeof generateCompletionItems> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    return generateCompletionItems();
});

// Hover handler
connection.onHover((params): ReturnType<typeof getHover> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    return getHover(document, params.position);
});

// Document symbol handler
connection.onDocumentSymbol((params): ReturnType<typeof getDocumentSymbols> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    return getDocumentSymbols(document);
});

// Definition handler
connection.onDefinition((params): ReturnType<typeof findDefinition> => {
    return findDefinition(documents, params.position, params.textDocument.uri);
});

// Document change handler
documents.onDidChangeContent((change): void => {
    buildSymbolDefinitions(change.document);
    validateTextDocument(connection, change.document);
});

// Document open handler
documents.onDidOpen((change): void => {
    buildSymbolDefinitions(change.document);
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
