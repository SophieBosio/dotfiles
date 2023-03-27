"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaTeXCommanderTreeView = void 0;
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("../lw"));
class LaTeXCommanderTreeView {
    constructor() {
        this.latexCommanderProvider = new LaTeXCommanderProvider();
        vscode.window.createTreeView('latex-workshop-commands', {
            treeDataProvider: this.latexCommanderProvider,
            showCollapseAll: true
        });
    }
    update() {
        this.latexCommanderProvider.update();
    }
}
exports.LaTeXCommanderTreeView = LaTeXCommanderTreeView;
class LaTeXCommanderProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.commands = [];
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        vscode.workspace.onDidChangeConfiguration((ev) => {
            if (ev.affectsConfiguration('latex-workshop.latex.recipes', lw.manager.getWorkspaceFolderRootDir())) {
                this.update();
            }
        });
        this.commands = this.buildCommandTree();
    }
    update() {
        this.commands = this.buildCommandTree();
        this._onDidChangeTreeData.fire(undefined);
    }
    buildNode(parent, children) {
        if (children.length > 0) {
            parent.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            parent.children = children;
            children.forEach((c) => c.parent = parent);
        }
        return parent;
    }
    buildCommandTree() {
        const commands = [];
        const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.manager.getWorkspaceFolderRootDir());
        const buildCommand = new LaTeXCommand('Build LaTeX project', { command: 'latex-workshop.build' }, 'debug-start');
        const recipes = configuration.get('latex.recipes', []);
        const recipeCommands = recipes.map(recipe => new LaTeXCommand(`Recipe: ${recipe.name}`, { command: 'latex-workshop.recipes', arguments: [recipe.name] }, 'debug-start'));
        let node;
        node = this.buildNode(buildCommand, [
            new LaTeXCommand('Clean up auxiliary files', { command: 'latex-workshop.clean' }, 'clear-all'),
            new LaTeXCommand('Terminate current compilation', { command: 'latex-workshop.kill' }, 'debug-stop'),
            ...recipeCommands
        ]);
        commands.push(node);
        const viewCommand = new LaTeXCommand('View LaTeX PDF', { command: 'latex-workshop.view' }, 'open-preview');
        node = this.buildNode(viewCommand, [
            new LaTeXCommand('View in VSCode tab', { command: 'latex-workshop.view', arguments: ['tab'] }, 'open-preview'),
            new LaTeXCommand('View in web browser', { command: 'latex-workshop.view', arguments: ['browser'] }, 'browser'),
            new LaTeXCommand('View in external viewer', { command: 'latex-workshop.view', arguments: ['external'] }, 'preview'),
            new LaTeXCommand('Refresh all viewers', { command: 'latex-workshop.refresh-viewer' }, 'refresh')
        ]);
        commands.push(node);
        const logCommand = new LaTeXCommand('View Log messages', { command: 'latex-workshop.log' }, 'output');
        const compilerLog = new LaTeXCommand('View LaTeX compiler log', { command: 'latex-workshop.compilerlog' }, 'output');
        const latexWorkshopLog = new LaTeXCommand('View LaTeX Workshop extension log', { command: 'latex-workshop.log' }, 'output');
        node = this.buildNode(logCommand, [
            latexWorkshopLog,
            compilerLog
        ]);
        commands.push(node);
        const navCommand = new LaTeXCommand('Navigate, select, and edit', undefined, 'edit');
        node = this.buildNode(navCommand, [
            new LaTeXCommand('SyncTeX from cursor', { command: 'latex-workshop.synctex' }, 'go-to-file'),
            new LaTeXCommand('Navigate to matching begin/end', { command: 'latex-workshop.navigate-envpair' }),
            new LaTeXCommand('Select current environment content', { command: 'latex-workshop.select-envcontent' }),
            new LaTeXCommand('Select current environment name', { command: 'latex-workshop.select-envname' }),
            new LaTeXCommand('Close current environment', { command: 'latex-workshop.close-env' }),
            new LaTeXCommand('Surround with begin{}...\\end{}', { command: 'latex-workshop.wrap-env' }),
            new LaTeXCommand('Insert %!TeX root magic comment', { command: 'latex-workshop.addtexroot' })
        ]);
        commands.push(node);
        const miscCommand = new LaTeXCommand('Miscellaneous', undefined, 'menu');
        node = this.buildNode(miscCommand, [
            new LaTeXCommand('Open citation browser', { command: 'latex-workshop.citation' }),
            new LaTeXCommand('Count words in LaTeX project', { command: 'latex-workshop.wordcount' }),
            new LaTeXCommand('Reveal output folder in OS', { command: 'latex-workshop.revealOutputDir' }, 'folder-opened')
        ]);
        commands.push(node);
        const bibtexCommand = new LaTeXCommand('BibTeX actions', undefined, 'references');
        node = this.buildNode(bibtexCommand, [
            new LaTeXCommand('Align bibliography', { command: 'latex-workshop.bibalign' }),
            new LaTeXCommand('Sort bibliography', { command: 'latex-workshop.bibsort' }, 'sort-precedence'),
            new LaTeXCommand('Align and sort bibliography', { command: 'latex-workshop.bibalignsort' })
        ]);
        commands.push(node);
        return commands;
    }
    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
        treeItem.command = element.command;
        treeItem.iconPath = element.codicon && new vscode.ThemeIcon(element.codicon);
        return treeItem;
    }
    getChildren(element) {
        if (!element) {
            return this.commands;
        }
        return element.children;
    }
    getParent(element) {
        return element.parent;
    }
}
class LaTeXCommand {
    constructor(label, command, codicon) {
        this.label = label;
        this.codicon = codicon;
        this.children = [];
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        if (command) {
            this.command = { ...command, title: '' };
        }
    }
}
//# sourceMappingURL=commander.js.map