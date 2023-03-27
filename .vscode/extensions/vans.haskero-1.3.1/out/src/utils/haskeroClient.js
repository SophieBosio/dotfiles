"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const vscli = require("vscode-languageclient");
const stack = require("../utils/stack");
class HaskeroClient {
    constructor(serverModule, debug) {
        this.debug = debug;
        this.targets = null;
        // The debug options for the server
        this.debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
        // Options to control the language client
        this.clientOptions = {
            // Register the server for plain text documents
            documentSelector: ['haskell'],
            synchronize: {
                // Synchronize the setting section 'haskero' to the server
                configurationSection: 'haskero'
                //     // Notify the server about file changes to '.clientrc files contain in the workspace
                //     fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
            },
            //using a callback here because LanguageClient detects if initializationOptions is a func and call it
            //thanks to this trick, we can change initOptions AFTER the LanguageClient instanciation
            //(usefull for changing cabals targets when LanguageClient has stoped working on an invalid target)
            initializationOptions: () => {
                return HaskeroClient.initOptions;
            }
        };
        // The debug options for the server
        let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
        this.serverOptions = {
            run: { module: serverModule, transport: vscli.TransportKind.ipc },
            debug: { module: serverModule, transport: vscli.TransportKind.ipc } //, options: debugOptions }
            //remove options here otherwise we experience node socket error msg
        };
    }
    get client() {
        return this._client;
    }
    start(initOptions) {
        HaskeroClient.initOptions = initOptions;
        this._client = new vscli.LanguageClient('Haskero', 'Haskero', this.serverOptions, this.clientOptions, this.debug);
        this.disposable = this._client.start();
        return this;
    }
    getTargets() {
        if (this.targets === null) {
            return stack.getTargets(HaskeroClient.initOptions.settings.intero.stackPath)
                .then(targets => {
                this.targets = targets;
                return Promise.resolve(targets);
            })
                .catch(reason => {
                if (reason.message.indexOf("Invalid argument", 0) > -1) {
                    const stackmsg = "Stack version is too low for the change targets feature. Update stack (min version = 1.2.0)";
                    reason.message = stackmsg + "\r\n\r\n" + reason.message;
                    vscode.window.showErrorMessage(stackmsg);
                }
                this._client.error('Error loading stack targets: ' + reason.message);
                return Promise.reject(reason);
            });
        }
        else {
            return Promise.resolve(this.targets);
        }
    }
    dispose() {
        if (this.disposable) {
            this.disposable.dispose();
            this._client = null;
        }
    }
}
exports.HaskeroClient = HaskeroClient;
//# sourceMappingURL=haskeroClient.js.map