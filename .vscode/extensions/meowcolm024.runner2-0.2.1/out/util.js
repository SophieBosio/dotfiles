"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHaskell = exports.registerSimplTerm = exports.resgisterStatButton = void 0;
const vscode = require("vscode");
// create status bar button
function resgisterStatButton(context, name, command, align = vscode.StatusBarAlignment.Left, priority = 10) {
    let stat = vscode.window.createStatusBarItem(align, priority);
    stat.text = name;
    stat.command = command;
    stat.show();
    context.subscriptions.push(stat);
}
exports.resgisterStatButton = resgisterStatButton;
// create a terminal and send command
function registerSimplTerm(context, command, name, cmd) {
    context.subscriptions.push(vscode.commands.registerCommand(command, () => {
        let term = vscode.window.createTerminal(name);
        term.sendText(cmd);
        term.show();
    }));
}
exports.registerSimplTerm = registerSimplTerm;
// is a haskell file
function isHaskell(text) {
    return text.languageId === 'haskell' || text.languageId === 'literate haskell';
}
exports.isHaskell = isHaskell;
//# sourceMappingURL=util.js.map