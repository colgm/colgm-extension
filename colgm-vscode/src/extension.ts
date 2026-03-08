import * as path from 'path';
import { ExtensionContext } from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));

    // Debug options: run the server in debug mode
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // Server options
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    // Client options
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'colgm' }],
        synchronize: {
            // Synchronize the setting section to the server
            configurationSection: 'colgm',
            // Notify the server about file changes to '.colgmrc' files
            fileEvents: []
        }
    };

    // Create the language client and start the client
    client = new LanguageClient(
        'colgmLanguageServer',
        'Colgm Language Server',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
