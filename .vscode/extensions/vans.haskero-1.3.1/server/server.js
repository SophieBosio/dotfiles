'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vsrv = require("vscode-languageserver");
const debugUtils_1 = require("./debug/debugUtils");
const haskeroService_1 = require("./haskeroService");
const typeAt_1 = require("./intero/commands/typeAt");
const uriUtils_1 = require("./utils/uriUtils");
const codeActionService_1 = require("./codeActions/codeActionService");
const commandsService_1 = require("./commands/commandsService");
const features = require("./features");
// Create a connection for the server. The connection uses Node's IPC as a transport
let connection = vsrv.createConnection(new vsrv.IPCMessageReader(process), new vsrv.IPCMessageWriter(process));
debugUtils_1.DebugUtils.init(false, connection);
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new vsrv.TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
let haskeroService = new haskeroService_1.HaskeroService();
// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot;
connection.onInitialize((params) => {
    workspaceRoot = params.rootPath;
    return haskeroService.initialize(connection, params.initializationOptions.settings, params.initializationOptions.targets);
});
connection.onRequest("changeTargets", (targets) => {
    return haskeroService.changeTargets(targets)
        .then((msg) => {
        documents.all().forEach((doc) => haskeroService.validateTextDocument(connection, doc));
        return Promise.resolve(msg);
    });
});
connection.onRequest("insertTypeAbove", (documentInfo) => {
    const documentURI = documentInfo.textDocument.uri;
    if (uriUtils_1.UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getHoverInformation(textDocument, documentInfo.position, typeAt_1.TypeInfoKind.Generic);
    }
});
connection.onExecuteCommand((exeCmdParams) => {
    let cmd = commandsService_1.CommandsService.getCommandInstance(exeCmdParams);
    if (!cmd) {
        console.log("Unknown command : ");
        console.dir(exeCmdParams);
        return null;
    }
    cmd.execute(connection.workspace, documents, haskeroService);
});
documents.onDidOpen((event) => {
    return haskeroService.validateTextDocument(connection, event.document);
});
connection.onInitialized((initializedParams) => {
    haskeroService.onInitialized();
});
// The settings have changed.
// Is sent on server activation as well.
connection.onDidChangeConfiguration((change) => {
    let settings = change.settings.haskero;
    debugUtils_1.DebugUtils.instance.isDebugOn = settings.debugMode;
    return haskeroService.changeSettings(settings)
        .then((msg) => {
        documents.all().forEach((doc) => haskeroService.validateTextDocument(connection, doc));
    })
        .catch(reason => {
        // A DidChangeConfiguration request doesn't have a response so we use showErrorMessage
        // to show an error message
        connection.window.showErrorMessage("Error while loading Haskero configuration: " + reason);
    });
});
connection.onDefinition((documentInfo) => {
    const documentURI = documentInfo.textDocument.uri;
    if (uriUtils_1.UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getDefinitionLocation(textDocument, documentInfo.position);
    }
});
connection.onHover((documentInfo) => {
    const documentURI = documentInfo.textDocument.uri;
    if (uriUtils_1.UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getHoverInformation(textDocument, documentInfo.position, typeAt_1.TypeInfoKind.Instanciated);
    }
});
connection.onCompletion((documentInfo) => {
    const documentURI = documentInfo.textDocument.uri;
    if (uriUtils_1.UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getCompletionItems(textDocument, documentInfo.position);
    }
});
connection.onCompletionResolve((item) => {
    return haskeroService.getResolveInfos(item);
});
connection.onReferences((referenceParams) => {
    const documentURI = referenceParams.textDocument.uri;
    if (uriUtils_1.UriUtils.isFileProtocol(documentURI)) {
        const textDocument = documents.get(documentURI);
        return haskeroService.getReferencesLocations(textDocument, referenceParams.position);
    }
});
/**
 * Code action lifecycle:
 *  - a bunch of diagnostics are sent from the server to the client (errors, warings, etc)
 *  - each diagnostic is a candidate for a codeAction
 *  - each time the user is hovering a range of code where diagnosics are attached (warning, error, etc.) a codeAction request is sent
 *    from the client to the server (ie : this very function is executed) with all the diagnotics for this range of code sent as parameters
 *  - the codeAction request needs a response containing one or several commands with unique ID and custom parameters
 *  - the title of the commands are displayed to the user, next to the line
 *  - when the user clicks on a command, a commandRequest is sent to the server with the command id and custom parameters
 *  - the onExecuteCommand function is executed with the command id/parameters and a WorkspaceEdit response is sent back to the client
 *    to modify corresponding files
 */
connection.onCodeAction((params) => {
    let CAs = codeActionService_1.CodeActionService.CodeActions;
    return params.context.diagnostics
        .map(diag => CAs.map(codeAction => codeAction.getCommand(params.textDocument, diag)))
        .reduce((accu, commands) => accu.concat(commands), []) //flatten commands[][] to commands[]
        .filter(c => c !== null);
});
connection.onRenameRequest(features.rename(documents, haskeroService));
documents.onDidSave(e => {
    return haskeroService.validateTextDocument(connection, e.document);
});
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map