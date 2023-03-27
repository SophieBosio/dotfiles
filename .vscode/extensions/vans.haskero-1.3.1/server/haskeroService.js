"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vsrv = require("vscode-languageserver");
const child_process = require("child_process");
const interoProxy_1 = require("./intero/interoProxy");
const init_1 = require("./intero/commands/init");
const reload_1 = require("./intero/commands/reload");
const interoDiagnostic_1 = require("./intero/commands/interoDiagnostic");
const locAt_1 = require("./intero/commands/locAt");
const uses_1 = require("./intero/commands/uses");
const typeAt_1 = require("./intero/commands/typeAt");
const documentUtils_1 = require("./utils/documentUtils");
const uriUtils_1 = require("./utils/uriUtils");
const debugUtils_1 = require("./debug/debugUtils");
const features_1 = require("./features/features");
const completionUtils_1 = require("./completionUtils");
const serverCapabilities = {
    capabilities: {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: vsrv.TextDocumentSyncKind.Full,
    }
};
/**
 * Exposes all haskero capabilities to the server
 */
class HaskeroService {
    constructor() {
        this.interoNotFOunt = "Executable named intero not found";
    }
    executeInteroRequest(request) {
        return request.send(this.interoProxy);
    }
    initialize(connection, settings, targets) {
        connection.console.log("Initializing Haskero...");
        this.settings = settings;
        this.connection = connection;
        this.features = new features_1.Features(connection);
        this.currentTargets = targets;
        return this.startInteroAndHandleErrors(targets)
            .then(() => {
            //server capabilities are sent later with a client/registerCapability request (just send the document sync capability here)
            //see onInitialized method
            this.initializationOk = true;
            return Promise.resolve(serverCapabilities);
        })
            .catch(reason => {
            this.initializationOk = false;
            return Promise.reject(reason);
        });
    }
    onInitialized() {
        if (this.initializationOk) {
            this.features.registerAllFeatures();
            this.connection.console.log("Haskero initialization done.");
        }
        else {
            this.connection.console.log("Haskero initialization failed.");
        }
    }
    startInteroAndHandleErrors(targets) {
        // Launch the intero process
        return this.spawnIntero(targets)
            .then((resp) => {
            return Promise.resolve();
        })
            .catch(reason => {
            return Promise.reject({
                code: 1,
                message: reason,
                data: { retry: false }
            });
        });
    }
    changeTargets(targets) {
        // It seems that we have to restart ghci to set new targets,
        // would be nice if there were a ghci command for it.
        const prettyString = (ts) => {
            if (ts.length === 0) {
                return "default targets";
            }
            else {
                return `${ts.join(' ')}`;
            }
        };
        this.connection.console.log('Restarting intero with targets: ' + prettyString(targets));
        return this.startInteroAndHandleErrors(targets)
            .then(() => {
            this.connection.console.log("Restart done.");
            this.features.registerAllFeatures();
            this.currentTargets = targets;
            return Promise.resolve('Intero restarted with targets: ' + prettyString(targets));
        })
            .catch(reason => {
            this.features.unregisterAllFeatures();
            return Promise.reject(reason.message);
        });
    }
    changeSettings(newSettings) {
        //if ghci options have changed we need to restart intero
        if (this.settings.intero.ignoreDotGhci != newSettings.intero.ignoreDotGhci ||
            this.settings.intero.stackPath != newSettings.intero.stackPath ||
            JSON.stringify(this.settings.intero.startupParams.sort()) != JSON.stringify(newSettings.intero.startupParams.sort()) ||
            JSON.stringify(this.settings.intero.ghciOptions.sort()) != JSON.stringify(newSettings.intero.ghciOptions.sort())) {
            // console.log("change in settings detected\r\n>old settings:\r\n");
            // console.dir(this.settings);
            // console.log("\r\nnew settings:\r\n");
            // console.dir(newSettings);
            this.settings = newSettings;
            //chaging targets restarts intero
            return this.changeTargets(this.currentTargets);
        }
        else {
            this.settings = newSettings;
            return Promise.resolve("Settings updated");
        }
    }
    getDefinitionLocation(textDocument, position) {
        let wordRange = documentUtils_1.DocumentUtils.getIdentifierAtPosition(textDocument, position, documentUtils_1.NoMatchAtCursorBehaviour.Stop);
        const locAtRequest = new locAt_1.LocAtRequest(textDocument.uri, documentUtils_1.DocumentUtils.toInteroRange(wordRange.range), wordRange.word);
        return locAtRequest
            .send(this.interoProxy)
            .then((response) => {
            if (response.isOk) {
                let fileUri = uriUtils_1.UriUtils.toUri(response.filePath);
                let loc = vsrv.Location.create(fileUri, documentUtils_1.DocumentUtils.toVSCodeRange(response.range));
                return Promise.resolve(loc);
            }
            else {
                return Promise.resolve(null);
            }
        });
    }
    getHoverInformation(textDocument, position, infoKind) {
        let wordRange = documentUtils_1.DocumentUtils.getIdentifierAtPosition(textDocument, position, documentUtils_1.NoMatchAtCursorBehaviour.Stop);
        if (!wordRange.isEmpty) {
            const typeAtRequest = new typeAt_1.TypeAtRequest(textDocument.uri, documentUtils_1.DocumentUtils.toInteroRange(wordRange.range), wordRange.word, infoKind);
            return typeAtRequest
                .send(this.interoProxy)
                .then((response) => {
                let typeInfo = { language: 'haskell', value: response.type };
                let hover = { contents: typeInfo };
                if (typeInfo.value !== null && typeInfo.value !== "") {
                    return Promise.resolve(hover);
                }
                else {
                    return Promise.resolve(null);
                }
            });
        }
        else {
            return Promise.resolve(null);
        }
    }
    getCompletionItems(textDocument, position) {
        const currentLine = documentUtils_1.DocumentUtils.getPositionLine(textDocument, position);
        if (currentLine.startsWith("import ")) {
            return completionUtils_1.CompletionUtils.getImportCompletionItems(this.interoProxy, textDocument, position, currentLine);
        }
        else {
            return completionUtils_1.CompletionUtils.getDefaultCompletionItems(this.interoProxy, textDocument, position, this.settings.maxAutoCompletionDetails);
        }
    }
    getResolveInfos(item) {
        return completionUtils_1.CompletionUtils.getResolveInfos(this.interoProxy, item);
    }
    getReferencesLocations(textDocument, position) {
        let wordRange = documentUtils_1.DocumentUtils.getIdentifierAtPosition(textDocument, position, documentUtils_1.NoMatchAtCursorBehaviour.Stop);
        const usesRequest = new uses_1.UsesRequest(textDocument.uri, documentUtils_1.DocumentUtils.toInteroRange(wordRange.range), wordRange.word);
        return usesRequest
            .send(this.interoProxy)
            .then((response) => {
            if (response.isOk) {
                return Promise.resolve(response.locations.map((interoLoc) => {
                    let fileUri = uriUtils_1.UriUtils.toUri(interoLoc.file);
                    return vsrv.Location.create(fileUri, documentUtils_1.DocumentUtils.toVSCodeRange(interoLoc.range));
                }));
            }
            else {
                return Promise.resolve(null);
            }
        });
    }
    validateTextDocument(connection, textDocument) {
        let problems = 0;
        debugUtils_1.DebugUtils.instance.connectionLog("validate : " + textDocument.uri);
        //when a file is opened in diff mode in VSCode, its url is not a path on disk
        if (uriUtils_1.UriUtils.isFileProtocol(textDocument.uri)) {
            const reloadRequest = new reload_1.ReloadRequest(textDocument.uri);
            debugUtils_1.DebugUtils.instance.connectionLog(textDocument.uri);
            return reloadRequest
                .send(this.interoProxy)
                .then((response) => {
                this.sendDocumentDiagnostics(connection, response.diagnostics.filter(d => {
                    return d.filePath.toLowerCase() === uriUtils_1.UriUtils.toFilePath(textDocument.uri).toLowerCase();
                }), textDocument.uri);
                return Promise.resolve();
            });
        }
        else {
            return Promise.resolve();
        }
    }
    getStartupParameters() {
        let ghciOptions = [];
        if (this.settings.intero.ignoreDotGhci) {
            ghciOptions.push('-ignore-dot-ghci');
        }
        ghciOptions = ghciOptions.concat(this.settings.intero.ghciOptions);
        //concat startup params AFTER default ghci-options (otherwise, it's impossible to override default ghci-options like -fno-warn-name-shadowing)
        return [`--ghci-options=${ghciOptions.join(' ')}`]
            .concat(this.settings.intero.startupParams);
    }
    prettifyStartupParamsCmd(parameters) {
        return parameters.map(p => {
            if (p.indexOf(' ') > -1) {
                return "\"" + p + "\"";
            }
            else {
                return p;
            }
        }).join(' ');
    }
    /**
     * Spawn an intero process (stack ghci --with-ghc intero ... targets)
     * and set `interoProxy`.
     */
    spawnIntero(targets) {
        const rootOptions = ['ghci', '--with-ghc', 'intero'];
        const allOptions = rootOptions.concat(this.getStartupParameters()).concat(targets);
        const stackPath = this.settings.intero.stackPath;
        this.connection.console.log(`Spawning process 'stack' with command '${stackPath} ${this.prettifyStartupParamsCmd(allOptions)}'`);
        if (this.interoProxy) {
            this.interoProxy.kill();
        }
        const intero = child_process.spawn(stackPath, allOptions);
        this.interoProxy = new interoProxy_1.InteroProxy(intero);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return new init_1.InitRequest()
                    .send(this.interoProxy)
                    .then((resp) => resolve(resp))
                    .catch(reason => {
                    if (reason.indexOf(this.interoNotFOunt, 0) > -1) {
                        return reject("Intero is not installed. See installation instructions here : https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing (details in Haskero tab output)\r\n\r\nDetails\r\n\r\n" + reason);
                    }
                    reject(reason);
                });
            }, 2000);
        });
    }
    sendAllDocumentsDiagnostics(connection, interoDiags) {
        //map the interoDiag to a vsCodeDiag and add it to the map of grouped diagnostics
        let addToMap = (accu, interoDiag) => {
            let uri = uriUtils_1.UriUtils.toUri(interoDiag.filePath);
            let vsCodeDiag = this.interoDiagToVScodeDiag(interoDiag);
            if (accu.has(uri)) {
                accu.get(uri).push(vsCodeDiag);
            }
            else {
                let vsCodeDiags = new Array();
                vsCodeDiags.push(vsCodeDiag);
                accu.set(uri, vsCodeDiags);
            }
            return accu;
        };
        //group diag by uri
        let groupedDiagnostics = interoDiags.reduce(addToMap, new Map());
        groupedDiagnostics.forEach((diags, documentUri) => {
            connection.sendDiagnostics({ uri: documentUri, diagnostics: diags });
        });
    }
    interoDiagToVScodeDiag(interoDiag) {
        return {
            severity: interoDiag.kind === interoDiagnostic_1.InteroDiagnosticKind.error ? vsrv.DiagnosticSeverity.Error : vsrv.DiagnosticSeverity.Warning,
            range: {
                start: { line: interoDiag.line, character: interoDiag.col },
                end: { line: interoDiag.line, character: interoDiag.col }
            },
            message: interoDiag.message,
            source: 'hs'
        };
    }
    sendDocumentDiagnostics(connection, interoDiags, documentUri) {
        let diagnostics = [];
        diagnostics = interoDiags.map(this.interoDiagToVScodeDiag);
        connection.sendDiagnostics({ uri: documentUri, diagnostics });
    }
}
exports.HaskeroService = HaskeroService;
//# sourceMappingURL=haskeroService.js.map