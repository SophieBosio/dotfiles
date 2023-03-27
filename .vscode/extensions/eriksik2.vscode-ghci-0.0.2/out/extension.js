"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const format = require("string-format");
const path = require("path");
const config = vscode.workspace.getConfiguration("haskellShell");
const settings = {
    ghcipath: config.get("ghci.executablePath"),
    ghciargs: config.get("ghci.arguments"),
    ghciprompt: config.get("ghci.customPrompt").replace("%", "%%"),
    enableCoupling: config.get("experimental.enablePromptCoupling"),
};
class GhciTerminal {
    constructor(cwd) {
        this.term = vscode.window.createTerminal({
            name: "Haskell Interactive Shell",
            shellPath: settings.ghcipath,
            shellArgs: settings.ghciargs,
            cwd: cwd,
            hideFromUser: true,
        });
    }
    dispose() { this.term.dispose(); }
    sendText(text) { this.term.sendText(text); }
    load(file) { this.sendText(":load \"" + file + "\""); }
    reload() { this.sendText(":reload"); }
    clear() { this.sendText(":! clear"); }
    setPrompt(prompt) { this.sendText(":set prompt \"" + prompt + "\""); }
    show() { this.term.show(true); }
    hide() { this.term.hide(); }
}
;
class DocumentTerminal {
    constructor(doc) {
        this.document = doc;
        const p = path.parse(this.document.fileName);
        this.term = new GhciTerminal(vscode.workspace.rootPath || p.dir); // TODO dont use vscode.workspace.rootPath
        this.disposables = vscode.Disposable.from(vscode.workspace.onDidSaveTextDocument(e => this.onSave(e)), this.term);
        // Set the prompt
        const fmtArgs = {
            file: p.base,
            dir: p.dir,
            line: "%l",
            modules: "%s"
        };
        this.term.setPrompt(format(settings.ghciprompt, fmtArgs));
        this.term.load(this.document.fileName);
    }
    dispose() { this.disposables.dispose(); }
    onSave(document) {
        if (document !== this.document)
            return;
        this.term.sendText("");
        this.term.reload();
    }
}
class DocumentTerminalHandler {
    constructor() {
        this.terminals = [];
        this.myTerminalActive = false; // is one of my terminals active? if this is false it will only get true by user action (switching to one of my terms or opening a new one)
        this.activeTerminal = vscode.window.activeTerminal;
        this.lastActiveTerminal = vscode.window.activeTerminal;
        this.disposables = vscode.Disposable.from(vscode.window.onDidChangeActiveTerminal(e => this.onChangeTerminal(e)), vscode.window.onDidChangeActiveTextEditor(e => this.onChangeDocument(e)), vscode.window.onDidCloseTerminal(e => this.onCloseTerminal(e)), vscode.workspace.onDidCloseTextDocument(e => this.onCloseDocument(e)));
    }
    dispose() {
        for (const term of this.terminals) {
            term.dispose();
        }
        this.disposables.dispose();
    }
    // handles activeTerminal, lastActiveTerminal, isActive logic
    onChangeTerminal(activeterm) {
        this.activeTerminal = activeterm;
        for (const term of this.terminals) {
            if (activeterm === term.term.term) {
                this.myTerminalActive = true;
                return;
            }
        }
        this.myTerminalActive = false;
        this.lastActiveTerminal = activeterm;
    }
    onChangeDocument(editor) {
        if (!editor)
            return;
        if (!settings.enableCoupling)
            return;
        let document = editor.document;
        for (const docterm of this.terminals)
            if (document === docterm.document) {
                docterm.term.show();
                return;
            }
        // if changed to doc wasnt one of mine
        if (this.activeTerminal !== this.lastActiveTerminal) {
            if (this.lastActiveTerminal)
                this.lastActiveTerminal.show();
            else
                this.activeTerminal.hide();
        }
    }
    onCloseTerminal(closedterm) {
        let ownedTerms = this.terminals.map(term => term.term.term);
        // onChangeTerminal is called before onCloseTerminal so the active term rn is the one that is focused after closing closedterm.
        if (closedterm == this.lastActiveTerminal)
            this.lastActiveTerminal = undefined;
        if (closedterm == this.activeTerminal)
            this.activeTerminal = undefined;
        // This makes it so that closing a ghci wont give focus to another ghci, eliminates possible confusion.
        if (this.myTerminalActive && settings.enableCoupling) { // If closing a term made one of my terms active,
            // ...try to switch to lastActiveTerminal. If lastActiveTerminal was the term that was closed and it doesnt exists, ...
            if (this.lastActiveTerminal)
                this.lastActiveTerminal.show();
            else {
                // ...find all terms that arent mine, and switch to the last one. If there arent any terms that arent mine, ...
                let otherTerms = vscode.window.terminals.filter(t => !ownedTerms.includes(t));
                if (otherTerms.length)
                    otherTerms[otherTerms.length - 1].show();
                else if (this.activeTerminal)
                    this.activeTerminal.hide(); // ...hide the active term (the one that was switched to automatically).
            }
        }
        // remove the closed terminal from my terminals
        let ind = ownedTerms.indexOf(closedterm);
        if (ind !== -1)
            this.terminals.splice(ind, 1)[0].dispose();
    }
    onCloseDocument(document) {
        for (const term of this.terminals) {
            if (document === term.document)
                this.removeTerm(term.term);
        }
    }
    // creates the term if it doesnt exist.
    getTerm(doc) {
        for (const term of this.terminals) {
            if (doc === term.document)
                return term.term;
        }
        let term = new DocumentTerminal(doc);
        this.terminals.push(term);
        return term.term;
    }
    findTerm(doc) {
        let index = this.terminals.map(x => x.document).indexOf(doc);
        if (index === -1)
            return undefined;
        return this.terminals[index].term;
    }
    removeTerm(term) {
        this.terminals.splice(this.terminals.map(x => x.term).indexOf(term), 1);
        term.dispose();
    }
}
class GhciPromptExtension {
    constructor() {
        this.terminalManager = new DocumentTerminalHandler();
        this.disposables = vscode.Disposable.from(this.terminalManager);
    }
    dispose() { this.disposables.dispose(); }
}
class Commands {
    constructor(ext) {
        let keys = Object.getOwnPropertyNames(Commands.prototype);
        let commandNames = keys.filter(k => !["constructor", "disposables", "dispose"].includes(k));
        this.disposables = vscode.Disposable.from(...commandNames.map(cmd => vscode.commands.registerCommand(cmd, () => this[cmd](ext))));
    }
    dispose() { this.disposables.dispose(); }
    "haskellShell.openPrompt"(ext) {
        let editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== "haskell") {
            vscode.window.showErrorMessage("This is not a Haskell source file.");
            return;
        }
        if (editor.document.isUntitled) {
            vscode.window.showErrorMessage("Please save the current file before opening the interactive prompt.");
            return;
        }
        if (editor.document.isDirty) {
            vscode.window.showInformationMessage("Save the file before opening the interactive prompt? (Not implemented)", "Yes", "No", "Always", "Never");
            return;
        }
        ext.terminalManager.getTerm(editor.document).show();
    }
    "haskellShell.closePrompt"(ext) {
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let term = ext.terminalManager.findTerm(editor.document);
        if (!term)
            return;
        ext.terminalManager.removeTerm(term);
    }
    "haskellShell.togglePrompt"(ext) {
        let editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        let term = ext.terminalManager.findTerm(editor.document);
        if (!term)
            this["haskellShell.openPrompt"](ext);
        else
            ext.terminalManager.removeTerm(term);
    }
}
function activate(context) {
    let ext = new GhciPromptExtension();
    let commands = new Commands(ext);
    context.subscriptions.push(ext, commands);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map