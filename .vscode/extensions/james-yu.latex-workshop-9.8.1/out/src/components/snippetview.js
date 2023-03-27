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
exports.SnippetView = void 0;
const vscode = __importStar(require("vscode"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const lw = __importStar(require("../lw"));
const webview_1 = require("../utils/webview");
class SnippetView {
    constructor() {
        this.snippetViewProvider = new SnippetViewProvider();
    }
    async renderPdf(pdfFileUri, opts) {
        const webview = this.snippetViewProvider.webviewView?.webview;
        if (!webview) {
            return;
        }
        const uri = webview.asWebviewUri(pdfFileUri).toString();
        let disposable;
        const promise = new Promise((resolve) => {
            disposable = this.snippetViewProvider.onDidReceiveMessage((e) => {
                if (e.type !== 'png') {
                    return;
                }
                if (e.uri === uri) {
                    resolve(e);
                }
            });
            setTimeout(() => {
                disposable?.dispose();
                resolve(undefined);
            }, 3000);
            void webview.postMessage({
                type: 'pdf',
                uri,
                opts
            });
        });
        try {
            const renderResult = await promise;
            return renderResult?.data;
        }
        finally {
            disposable?.dispose();
        }
    }
}
exports.SnippetView = SnippetView;
class SnippetViewProvider {
    constructor() {
        this.cbSet = new Set();
        const editor = vscode.window.activeTextEditor;
        if (editor && lw.manager.hasTexId(editor.document.languageId)) {
            this.lastActiveTextEditor = editor;
        }
        vscode.window.onDidChangeActiveTextEditor(textEditor => {
            if (textEditor && lw.manager.hasTexId(textEditor.document.languageId)) {
                this.lastActiveTextEditor = textEditor;
            }
        });
    }
    get webviewView() {
        return this.view;
    }
    resolveWebviewView(webviewView) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.onDidDispose(() => {
            this.view = undefined;
        });
        const webviewSourcePath = path.join(lw.extensionRoot, 'resources', 'snippetview', 'snippetview.html');
        let webviewHtml = (0, fs_1.readFileSync)(webviewSourcePath, { encoding: 'utf8' });
        webviewHtml = (0, webview_1.replaceWebviewPlaceholders)(webviewHtml, this.view.webview);
        webviewView.webview.html = webviewHtml;
        webviewView.webview.onDidReceiveMessage((e) => {
            this.cbSet.forEach((cb) => void cb(e));
            this.messageReceive(e);
        });
    }
    messageReceive(message) {
        if (message.type === 'insertSnippet') {
            const editor = this.lastActiveTextEditor;
            if (editor) {
                editor.insertSnippet(new vscode.SnippetString(message.snippet.replace(/\\\n/g, '\\n'))).then(() => { }, err => {
                    void vscode.window.showWarningMessage(`Unable to insert symbol, ${err}`);
                });
            }
            else {
                void vscode.window.showWarningMessage('Unable get document to insert symbol into');
            }
        }
    }
    onDidReceiveMessage(cb) {
        this.cbSet.add(cb);
        return {
            dispose: () => this.cbSet.delete(cb)
        };
    }
}
//# sourceMappingURL=snippetview.js.map