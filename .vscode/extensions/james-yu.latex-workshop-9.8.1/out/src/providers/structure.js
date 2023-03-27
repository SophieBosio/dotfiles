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
exports.StructureTreeView = exports.SectionNodeProvider = void 0;
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("../lw"));
const eventbus_1 = require("../components/eventbus");
const latex_1 = require("./structurelib/latex");
const bibtex_1 = require("./structurelib/bibtex");
const doctex_1 = require("./structurelib/doctex");
const logger_1 = require("../components/logger");
const logger = (0, logger_1.getLogger)('Structure');
class SectionNodeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.root = '';
        // our data source is a set multi-rooted set of trees
        this.ds = [];
        this.cachedTeXSec = undefined;
        this.cachedBibSec = undefined;
        this.cachedDocTeXSec = undefined;
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    getCachedDataRootFileName(sections) {
        if (sections.length > 0) {
            return sections[0].fileName;
        }
        return;
    }
    /**
     * Return the latex or bibtex structure
     *
     * @param force If `false` and some cached data exists for the corresponding file, use it. If `true`, always recompute the structure from disk
     */
    async build(force) {
        const document = vscode.window.activeTextEditor?.document;
        if (document?.languageId === 'doctex') {
            if (force || !this.cachedDocTeXSec || this.getCachedDataRootFileName(this.cachedDocTeXSec) !== document.fileName) {
                this.cachedDocTeXSec = undefined;
                this.cachedDocTeXSec = await doctex_1.DocTeXStructure.buildDocTeXModel(document);
            }
            this.ds = this.cachedDocTeXSec;
            logger.log(`Structure updated with ${this.ds.length} entries for ${document.uri.fsPath} .`);
        }
        else if (document?.languageId === 'bibtex') {
            if (force || !this.cachedBibSec || this.getCachedDataRootFileName(this.cachedBibSec) !== document.fileName) {
                this.cachedBibSec = undefined;
                this.cachedBibSec = await bibtex_1.BibTeXStructure.buildBibTeXModel(document);
            }
            this.ds = this.cachedBibSec;
            logger.log(`Structure updated with ${this.ds.length} entries for ${document.uri.fsPath} .`);
        }
        else if (lw.manager.rootFile) {
            if (force || !this.cachedTeXSec) {
                this.cachedTeXSec = undefined;
                this.cachedTeXSec = await latex_1.LaTeXStructure.buildLaTeXModel();
            }
            this.ds = this.cachedTeXSec;
            logger.log(`Structure ${force ? 'force ' : ''}updated with ${this.ds.length} root sections for ${lw.manager.rootFile} .`);
        }
        else {
            this.ds = [];
            logger.log('Structure cleared on undefined root.');
        }
        return this.ds;
    }
    async update(force) {
        this.ds = await this.build(force);
        this._onDidChangeTreeData.fire(undefined);
        lw.eventBus.fire(eventbus_1.StructureUpdated);
    }
    getTreeItem(element) {
        const hasChildren = element.children.length > 0;
        const treeItem = new vscode.TreeItem(element.label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        treeItem.command = {
            command: 'latex-workshop.goto-section',
            title: '',
            arguments: [element.fileName, element.lineNumber]
        };
        treeItem.tooltip = `Line ${element.lineNumber + 1} at ${element.fileName}`;
        return treeItem;
    }
    getChildren(element) {
        if (lw.manager.rootFile === undefined) {
            return [];
        }
        // if the root doesn't exist, we need
        // to explicitly build the model from disk
        if (!element) {
            return this.build(false);
        }
        return element.children;
    }
    getParent(element) {
        if (lw.manager.rootFile === undefined || !element) {
            return;
        }
        return element.parent;
    }
}
exports.SectionNodeProvider = SectionNodeProvider;
class StructureTreeView {
    constructor() {
        this._followCursor = true;
        this._treeDataProvider = new SectionNodeProvider();
        this._viewer = vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider: this._treeDataProvider, showCollapseAll: true });
        vscode.commands.registerCommand('latex-workshop.structure-toggle-follow-cursor', () => {
            this._followCursor = !this._followCursor;
            logger.log(`Follow cursor is set to ${this._followCursor}.`);
        });
        vscode.workspace.onDidSaveTextDocument((e) => {
            if (lw.manager.hasBibtexId(e.languageId) || lw.manager.hasDoctexId(e.languageId)) {
                void lw.structureViewer.computeTreeStructure();
            }
        });
        vscode.window.onDidChangeActiveTextEditor((e) => {
            if (!e) {
                return;
            }
            if (lw.manager.hasBibtexId(e.document.languageId) || lw.manager.hasDoctexId(e.document.languageId)) {
                void lw.structureViewer.refreshView();
            }
        });
    }
    /**
     * Recompute the whole structure from file and update the view
     */
    async computeTreeStructure() {
        await this._treeDataProvider.update(true);
    }
    /**
     * Refresh the view using cache
     */
    async refreshView() {
        await this._treeDataProvider.update(false);
    }
    getTreeData() {
        return this._treeDataProvider.ds;
    }
    traverseSectionTree(sections, fileName, lineNumber) {
        let match = undefined;
        for (const node of sections) {
            if ((node.fileName === fileName &&
                node.lineNumber <= lineNumber && node.toLine >= lineNumber) ||
                (node.fileName !== fileName && node.subfiles.includes(fileName))) {
                match = node;
                // Look for a more precise surrounding section
                const res = this.traverseSectionTree(node.children, fileName, lineNumber);
                if (res) {
                    match = res;
                }
            }
        }
        return match;
    }
    showCursorItem(e) {
        if (!this._followCursor || !this._viewer.visible) {
            return;
        }
        const line = e.selections[0].active.line;
        const f = e.textEditor.document.fileName;
        const currentNode = this.traverseSectionTree(this._treeDataProvider.ds, f, line);
        if (currentNode) {
            return this._viewer.reveal(currentNode, { select: true });
        }
        return;
    }
}
exports.StructureTreeView = StructureTreeView;
//# sourceMappingURL=structure.js.map