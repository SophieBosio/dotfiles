"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const option = require("./option");
const conf = require("./config");
const util = require("./util");
// configuration
var config = conf.getConfig();
// current terminal
var terminal = option.none();
// I'm not sure if we can do `async` here
async function activate(context) {
    // setup terminal
    vscode.window.onDidChangeActiveTerminal(e => { terminal = option.option(e); });
    // update config
    vscode.workspace.onDidChangeConfiguration(e => { config = conf.getConfig(); });
    // check stack project
    let stackproj = (await vscode.workspace.findFiles("stack.yaml")).length > 0;
    // GHCi command
    let ghci = vscode.commands.registerCommand("runner2.ghci", () => {
        let filename = option.option(vscode.window.activeTextEditor)
            .map(e => e.document)
            .flatmap(d => option.filterOption(util.isHaskell, d))
            .map(s => `\"${s.fileName}\"`);
        // currently at GHCi
        if (terminal.map(t => t.name).contains("GHCi")) {
            filename
                .map(f => f.split("\\").join("\\\\")) // windows path may contain backslash
                .map(f => terminal.unwrap().sendText(stackproj ? ":r" : (":l " + f)));
        }
        else {
            let term = vscode.window.createTerminal("GHCi");
            term.sendText(config.ghciTool(stackproj) + " " + (stackproj ? "" : filename.orelse("")));
            term.show();
        }
    });
    context.subscriptions.push(ghci);
    // send selected code to GHCi
    let sendGhci = vscode.commands.registerCommand("runner2.sendGhci", () => option.option(vscode.window.activeTextEditor)
        .map(e => e.document.getText(new vscode.Range(e.selection.start, e.selection.end)))
        .flatmap(s => option.filterOption(x => x.trim() !== "", s))
        .map(s => ":{\n" + s + "\n:}\n") // in case of multi-line selection
        .map(s => {
        if (terminal.map(t => t.name).contains("GHCi")) {
            terminal.unwrap().sendText(s);
        }
        else {
            let term = vscode.window.createTerminal("GHCi");
            term.sendText(config.ghciTool(stackproj)); // we're not loading the file here
            term.sendText(s);
            term.show();
        }
    }));
    context.subscriptions.push(sendGhci);
    // stack project commands
    util.registerSimplTerm(context, "runner2.stacktest", "Stack Test", config.stackPath + " test");
    util.registerSimplTerm(context, "runner2.stackbuild", "Stack Build", config.stackPath + " build");
    util.registerSimplTerm(context, "runner2.stackrun", "Stack Run", config.stackPath + " run");
    // button setup
    util.resgisterStatButton(context, "Load GHCi", "runner2.ghci");
    // button for stack project
    if (stackproj) {
        util.resgisterStatButton(context, "Stack Build", "runner2.stackbuild");
        util.resgisterStatButton(context, "Stack Test", "runner2.stacktest");
        if (config.enableStackRun) {
            util.resgisterStatButton(context, "Stack Run", "runner2.stackrun");
        }
    }
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map