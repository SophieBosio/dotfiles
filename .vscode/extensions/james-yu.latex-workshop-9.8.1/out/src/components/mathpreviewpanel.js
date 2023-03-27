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
exports.MathPreviewPanel = exports.MathPreviewPanelSerializer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const webview_1 = require("../utils/webview");
const lw = __importStar(require("../lw"));
const logger_1 = require("./logger");
const logger = (0, logger_1.getLogger)('Preview', 'Math');
function resourcesFolder(extensionRoot) {
    const folder = path.join(extensionRoot, 'resources', 'mathpreviewpanel');
    return vscode.Uri.file(folder);
}
class MathPreviewPanelSerializer {
    deserializeWebviewPanel(panel) {
        lw.mathPreviewPanel.initializePanel(panel);
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [resourcesFolder(lw.extensionRoot)]
        };
        panel.webview.html = lw.mathPreviewPanel.getHtml(panel.webview);
        logger.log('Math preview panel: restored');
        return Promise.resolve();
    }
}
exports.MathPreviewPanelSerializer = MathPreviewPanelSerializer;
class MathPreviewPanel {
    constructor() {
        this.prevEditTime = 0;
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        this.needCursor = configuration.get('mathpreviewpanel.cursor.enabled', false);
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('latex-workshop.mathpreviewpanel.cursor.enabled')) {
                const conf = vscode.workspace.getConfiguration('latex-workshop');
                this.needCursor = conf.get('mathpreviewpanel.cursor.enabled', false);
            }
        });
    }
    get mathPreview() {
        return lw.mathPreview;
    }
    open() {
        const activeDocument = vscode.window.activeTextEditor?.document;
        if (this.panel) {
            if (!this.panel.visible) {
                this.panel.reveal(undefined, true);
            }
            return;
        }
        this.mathPreview.getColor();
        const panel = vscode.window.createWebviewPanel('latex-workshop-mathpreview', 'Math Preview', { viewColumn: vscode.ViewColumn.Active, preserveFocus: true }, {
            enableScripts: true,
            localResourceRoots: [resourcesFolder(lw.extensionRoot)],
            retainContextWhenHidden: true
        });
        this.initializePanel(panel);
        panel.webview.html = this.getHtml(panel.webview);
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const editorGroup = configuration.get('mathpreviewpanel.editorGroup');
        if (activeDocument) {
            void (0, webview_1.moveWebviewPanel)(panel, editorGroup);
        }
        logger.log('Math preview panel: opened');
    }
    initializePanel(panel) {
        const disposable = vscode.Disposable.from(vscode.workspace.onDidChangeTextDocument((event) => {
            void lw.mathPreviewPanel.update({ type: 'edit', event });
        }), vscode.window.onDidChangeTextEditorSelection((event) => {
            void lw.mathPreviewPanel.update({ type: 'selection', event });
        }));
        this.panel = panel;
        panel.onDidDispose(() => {
            disposable.dispose();
            this.clearCache();
            this.panel = undefined;
            logger.log('Math preview panel: disposed');
        });
        panel.onDidChangeViewState((ev) => {
            if (ev.webviewPanel.visible) {
                void this.update();
            }
        });
        panel.webview.onDidReceiveMessage(() => {
            logger.log('Math preview panel: initialized');
            void this.update();
        });
    }
    close() {
        this.panel?.dispose();
        this.panel = undefined;
        this.clearCache();
        logger.log('Math preview panel: closed');
    }
    toggle() {
        if (this.panel) {
            this.close();
        }
        else {
            this.open();
        }
    }
    clearCache() {
        this.prevEditTime = 0;
        this.prevDocumentUri = undefined;
        this.prevCursorPosition = undefined;
        this.prevNewCommands = undefined;
    }
    getHtml(webview) {
        const jsPath = vscode.Uri.file(path.join(lw.extensionRoot, './resources/mathpreviewpanel/mathpreview.js'));
        const jsPathSrc = webview.asWebviewUri(jsPath);
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; script-src ${webview.cspSource}; img-src data:; style-src 'unsafe-inline';">
            <meta charset="UTF-8">
            <style>
                body {
                    padding: 0;
                    margin: 0;
                }
                #math {
                    padding-top: 35px;
                    padding-left: 50px;
                }
            </style>
            <script src='${jsPathSrc}' defer></script>
        </head>
        <body>
            <div id="mathBlock"><img src="" id="math" /></div>
        </body>
        </html>`;
    }
    async update(ev) {
        if (!this.panel || !this.panel.visible) {
            return;
        }
        if (!this.needCursor) {
            if (ev?.type === 'edit') {
                this.prevEditTime = Date.now();
            }
            else if (ev?.type === 'selection') {
                if (Date.now() - this.prevEditTime < 100) {
                    return;
                }
            }
        }
        const editor = vscode.window.activeTextEditor;
        const document = editor?.document;
        if (!editor || !document?.languageId || !lw.manager.hasTexId(document.languageId)) {
            this.clearCache();
            return;
        }
        const documentUri = document.uri.toString();
        if (ev?.type === 'edit' && documentUri !== ev.event.document.uri.toString()) {
            return;
        }
        const position = editor.selection.active;
        const texMath = this.getTexMath(document, position);
        if (!texMath) {
            this.clearCache();
            return this.panel.webview.postMessage({ type: 'mathImage', src: '' });
        }
        let cachedCommands;
        if (position.line === this.prevCursorPosition?.line && documentUri === this.prevDocumentUri) {
            cachedCommands = this.prevNewCommands;
        }
        if (this.needCursor) {
            await this.renderCursor(document, texMath);
        }
        const result = await this.mathPreview.generateSVG(texMath, cachedCommands).catch(() => undefined);
        if (!result) {
            return;
        }
        this.prevDocumentUri = documentUri;
        this.prevNewCommands = result.newCommands;
        this.prevCursorPosition = position;
        return this.panel.webview.postMessage({ type: 'mathImage', src: result.svgDataUrl });
    }
    getTexMath(document, position) {
        const texMath = this.mathPreview.findMathEnvIncludingPosition(document, position);
        if (texMath) {
            if (texMath.envname !== '$') {
                return texMath;
            }
            if (texMath.range.start.character !== position.character && texMath.range.end.character !== position.character) {
                return texMath;
            }
        }
        return;
    }
    async renderCursor(document, tex) {
        const s = await this.mathPreview.renderCursor(document, tex);
        tex.texString = s;
    }
}
exports.MathPreviewPanel = MathPreviewPanel;
//# sourceMappingURL=mathpreviewpanel.js.map