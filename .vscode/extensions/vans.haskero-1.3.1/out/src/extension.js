'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const insertTypeAbove_1 = require("./commands/insertTypeAbove");
const selectTargets_1 = require("./commands/selectTargets");
const haskeroClient_1 = require("./utils/haskeroClient");
function activate(context) {
    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    let haskeroClient = new haskeroClient_1.HaskeroClient(serverModule, true);
    let initOptions = {
        settings: getSettings(),
        targets: [] //no target for starting the extension
    };
    haskeroClient.start(initOptions);
    registerCommands(haskeroClient, context);
    createTargetSelectionButton(context);
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(haskeroClient);
}
exports.activate = activate;
/**
 * Returns value if value is not null or undefined, otherwise returns defaultValue
*/
function df(value, defaultValue) {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    else {
        return value;
    }
}
function getSettings() {
    ///get initialization settings from current workspace getConfiguration
    let interoSettings = {
        stackPath: df(vscode.workspace.getConfiguration('haskero.intero').get('stackPath'), 'stack'),
        startupParams: df(vscode.workspace.getConfiguration('haskero.intero').get('startupParams'), ['--no-build', '--no-load']),
        ghciOptions: df(vscode.workspace.getConfiguration('haskero.intero').get('ghciOptions'), ['-Wall']),
        ignoreDotGhci: df(vscode.workspace.getConfiguration('haskero.intero').get('ignoreDotGhci'), true)
    };
    let haskeroSettings = {
        intero: interoSettings,
        debugMode: df(vscode.workspace.getConfiguration('haskero').get('debugMode'), false),
        maxAutoCompletionDetails: df(vscode.workspace.getConfiguration('haskero').get('maxAutoCompletionDetails'), 100)
    };
    return haskeroSettings;
}
/**
 * Register all Haskero available commands
 */
function registerCommands(haskeroClient, context) {
    const cmds = [
        new insertTypeAbove_1.InsertTypeAbove(haskeroClient),
        new selectTargets_1.SelectTarget(haskeroClient),
    ];
    cmds.forEach((cmd) => {
        context.subscriptions.push(vscode.commands.registerCommand(cmd.id, cmd.handler));
    });
}
/**
 * Create the Cabal target selection button in the status bar
 */
function createTargetSelectionButton(context) {
    const barItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
    barItem.text = "Targets: default";
    barItem.command = selectTargets_1.SelectTarget.id;
    barItem.show();
    context.subscriptions.push(selectTargets_1.SelectTarget.onTargetsSelected.event((haskeroTargets) => {
        barItem.text = haskeroTargets.toText();
    }));
}
//# sourceMappingURL=extension.js.map