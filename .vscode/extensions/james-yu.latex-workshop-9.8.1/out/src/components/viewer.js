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
exports.Viewer = exports.pdfViewerPanelSerializer = exports.pdfViewerHookProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const cs = __importStar(require("cross-spawn"));
const lw = __importStar(require("../lw"));
const theme_1 = require("../utils/theme");
const client_1 = require("./viewerlib/client");
const pdfviewerpanel_1 = require("./viewerlib/pdfviewerpanel");
const pdfviewermanager_1 = require("./viewerlib/pdfviewermanager");
const eventbus_1 = require("./eventbus");
const logger_1 = require("./logger");
const webview_1 = require("../utils/webview");
const logger = (0, logger_1.getLogger)('Viewer');
var pdfviewerhook_1 = require("./viewerlib/pdfviewerhook");
Object.defineProperty(exports, "pdfViewerHookProvider", { enumerable: true, get: function () { return pdfviewerhook_1.pdfViewerHookProvider; } });
var pdfviewerpanel_2 = require("./viewerlib/pdfviewerpanel");
Object.defineProperty(exports, "pdfViewerPanelSerializer", { enumerable: true, get: function () { return pdfviewerpanel_2.pdfViewerPanelSerializer; } });
class Viewer {
    constructor() {
        lw.cacher.pdf.onChange(pdfPath => {
            if (lw.builder.isOutputPDF(pdfPath)) {
                this.refreshExistingViewer(undefined, pdfPath);
            }
        });
        lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('latex-workshop.view.pdf.invertMode.enabled') ||
                e.affectsConfiguration('latex-workshop.view.pdf.invert') ||
                e.affectsConfiguration('latex-workshop.view.pdf.invertMode.brightness') ||
                e.affectsConfiguration('latex-workshop.view.pdf.invertMode.grayscale') ||
                e.affectsConfiguration('latex-workshop.view.pdf.invertMode.hueRotate') ||
                e.affectsConfiguration('latex-workshop.view.pdf.invertMode.sepia') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.light.pageColorsForeground') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.light.pageColorsBackground') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.light.backgroundColor') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.light.pageBorderColor') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.dark.pageColorsForeground') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.dark.pageColorsBackground') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.dark.backgroundColor') ||
                e.affectsConfiguration('latex-workshop.view.pdf.color.dark.pageBorderColor') ||
                e.affectsConfiguration('latex-workshop.view.pdf.internal.synctex.keybinding')) {
                this.reloadExistingViewer();
            }
            return;
        }));
    }
    reloadExistingViewer() {
        pdfviewermanager_1.viewerManager.clientMap.forEach(clientSet => {
            clientSet.forEach(client => {
                client.send({ type: 'reload' });
            });
        });
    }
    /**
     * Refreshes PDF viewers of `sourceFile`.
     *
     * @param sourceFile The path of a LaTeX file. If `sourceFile` is `undefined`,
     * refreshes all the PDF viewers.
     */
    refreshExistingViewer(sourceFile, pdfFile) {
        logger.log(`Call refreshExistingViewer: ${JSON.stringify(sourceFile ?? pdfFile)} .`);
        const pdfUri = pdfFile ? vscode.Uri.file(pdfFile) : (sourceFile ? this.tex2pdf(sourceFile) : undefined);
        if (pdfUri === undefined) {
            pdfviewermanager_1.viewerManager.clientMap.forEach(clientSet => {
                clientSet.forEach(client => {
                    client.send({ type: 'refresh' });
                });
            });
            return;
        }
        const clientSet = pdfviewermanager_1.viewerManager.getClientSet(pdfUri);
        if (!clientSet) {
            logger.log(`Not found PDF viewers to refresh: ${pdfFile}`);
            return;
        }
        logger.log(`Refresh PDF viewer: ${pdfFile}`);
        clientSet.forEach(client => {
            client.send({ type: 'refresh' });
        });
    }
    async checkViewer(sourceFile) {
        const pdfUri = this.tex2pdf(sourceFile);
        if (!await lw.lwfs.exists(pdfUri)) {
            logger.log(`Cannot find PDF file ${pdfUri}`);
            logger.refreshStatus('check', 'statusBar.foreground', `Cannot view file PDF file. File not found: ${pdfUri}`, 'warning');
            return;
        }
        return (await lw.server.getViewerUrl(pdfUri)).url;
    }
    /**
     * Opens the PDF file of `sourceFile` in the browser.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    async openBrowser(sourceFile) {
        const url = await this.checkViewer(sourceFile);
        if (!url) {
            return;
        }
        const pdfFileUri = this.tex2pdf(sourceFile);
        pdfviewermanager_1.viewerManager.createClientSet(pdfFileUri);
        lw.cacher.pdf.add(pdfFileUri.fsPath);
        try {
            logger.log(`Serving PDF file at ${url}`);
            await vscode.env.openExternal(vscode.Uri.parse(url, true));
            logger.log(`Open PDF viewer for ${pdfFileUri.toString(true)}`);
        }
        catch (e) {
            void vscode.window.showInputBox({
                prompt: 'Unable to open browser. Please copy and visit this link.',
                value: url
            });
            logger.logError(`Failed opening PDF viewer for ${pdfFileUri.toString(true)}`, e);
        }
    }
    tex2pdf(sourceFile) {
        const pdfFilePath = lw.manager.tex2pdf(sourceFile);
        return vscode.Uri.file(pdfFilePath);
    }
    /**
     * Opens the PDF file of `sourceFile` in the internal PDF viewer.
     *
     * @param sourceFile The path of a LaTeX file.
     * @param tabEditorGroup
     * @param preserveFocus
     */
    async openTab(sourceFile, tabEditorGroup, preserveFocus) {
        const url = await this.checkViewer(sourceFile);
        if (!url) {
            return;
        }
        const pdfUri = this.tex2pdf(sourceFile);
        return this.openPdfInTab(pdfUri, tabEditorGroup, preserveFocus);
    }
    async openPdfInTab(pdfUri, tabEditorGroup, preserveFocus) {
        const activeDocument = vscode.window.activeTextEditor?.document;
        const panel = await (0, pdfviewerpanel_1.createPdfViewerPanel)(pdfUri, tabEditorGroup === 'current');
        pdfviewermanager_1.viewerManager.initiatePdfViewerPanel(panel);
        if (!panel) {
            return;
        }
        if (tabEditorGroup !== 'current' && activeDocument) {
            await (0, webview_1.moveActiveEditor)(tabEditorGroup, preserveFocus);
        }
        logger.log(`Open PDF tab for ${pdfUri.toString(true)}`);
    }
    /**
     * Opens the PDF file of `sourceFile` in the external PDF viewer.
     *
     * @param sourceFile The path of a LaTeX file.
     */
    openExternal(sourceFile) {
        const pdfFile = lw.manager.tex2pdf(sourceFile);
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        let command = configuration.get('view.pdf.external.viewer.command');
        let args = configuration.get('view.pdf.external.viewer.args');
        if (!command) {
            switch (process.platform) {
                case 'win32':
                    command = 'SumatraPDF.exe';
                    args = ['%PDF%'];
                    break;
                case 'linux':
                    command = 'xdg-open';
                    args = ['%PDF%'];
                    break;
                case 'darwin':
                    command = 'open';
                    args = ['%PDF%'];
                    break;
                default:
                    break;
            }
        }
        if (args) {
            args = args.map(arg => arg.replace('%PDF%', pdfFile));
        }
        logger.log(`Open external viewer for ${pdfFile}`);
        logger.logCommand('Execute the external PDF viewer command', command, args);
        const proc = cs.spawn(command, args, { cwd: path.dirname(sourceFile), detached: true });
        let stdout = '';
        proc.stdout.on('data', newStdout => {
            stdout += newStdout;
        });
        let stderr = '';
        proc.stderr.on('data', newStderr => {
            stderr += newStderr;
        });
        const cb = () => {
            void logger.log(`The external PDF viewer stdout: ${stdout}`);
            void logger.log(`The external PDF viewer stderr: ${stderr}`);
        };
        proc.on('error', cb);
        proc.on('exit', cb);
    }
    /**
     * Handles the request from the internal PDF viewer.
     *
     * @param websocket The WebSocket connecting with the viewer.
     * @param msg A message from the viewer in JSON fromat.
     */
    handler(websocket, msg) {
        const data = JSON.parse(msg);
        if (data.type !== 'ping') {
            logger.log(`Handle data type: ${data.type}`);
        }
        switch (data.type) {
            case 'open': {
                const pdfFileUri = vscode.Uri.parse(data.pdfFileUri, true);
                const clientSet = pdfviewermanager_1.viewerManager.getClientSet(pdfFileUri);
                if (clientSet === undefined) {
                    break;
                }
                const client = new client_1.Client(data.viewer, websocket);
                clientSet.add(client);
                client.onDidDispose(() => {
                    clientSet.delete(client);
                });
                break;
            }
            case 'loaded': {
                lw.eventBus.fire(eventbus_1.ViewerPageLoaded);
                const configuration = vscode.workspace.getConfiguration('latex-workshop');
                if (configuration.get('synctex.afterBuild.enabled')) {
                    logger.log('SyncTex after build invoked.');
                    const uri = vscode.Uri.parse(data.pdfFileUri, true);
                    lw.locator.syncTeX(undefined, undefined, uri.fsPath);
                }
                break;
            }
            case 'reverse_synctex': {
                const uri = vscode.Uri.parse(data.pdfFileUri, true);
                void lw.locator.locate(data, uri.fsPath);
                break;
            }
            case 'external_link': {
                void vscode.env.clipboard.writeText(data.url);
                const uri = vscode.Uri.parse(data.url);
                if (['http', 'https'].includes(uri.scheme)) {
                    void vscode.env.openExternal(uri);
                }
                else {
                    vscode.window.showInformationMessage(`The link ${data.url} has been copied to clipboard.`, 'Open link', 'Dismiss').then(option => {
                        switch (option) {
                            case 'Open link':
                                void vscode.env.openExternal(uri);
                                break;
                            default:
                                break;
                        }
                    }, reason => {
                        logger.log(`Unknown error when opening URI. Error: ${JSON.stringify(reason)}, URI: ${data.url}`);
                    });
                }
                break;
            }
            case 'ping': {
                // nothing to do
                break;
            }
            case 'add_log': {
                logger.log(`${data.message}`);
                break;
            }
            case 'copy': {
                if ((data.isMetaKey && os.platform() === 'darwin') ||
                    (!data.isMetaKey && os.platform() !== 'darwin')) {
                    void vscode.env.clipboard.writeText(data.content);
                }
                break;
            }
            default: {
                logger.log(`Unknown websocket message: ${msg}`);
                break;
            }
        }
    }
    viewerParams() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const invertType = configuration.get('view.pdf.invertMode.enabled');
        const invertEnabled = (invertType === 'auto' && ((0, theme_1.getCurrentThemeLightness)() === 'dark')) ||
            invertType === 'always' ||
            (invertType === 'compat' && (configuration.get('view.pdf.invert') > 0));
        const pack = {
            scale: configuration.get('view.pdf.zoom'),
            trim: configuration.get('view.pdf.trim'),
            scrollMode: configuration.get('view.pdf.scrollMode'),
            spreadMode: configuration.get('view.pdf.spreadMode'),
            hand: configuration.get('view.pdf.hand'),
            invertMode: {
                enabled: invertEnabled,
                brightness: configuration.get('view.pdf.invertMode.brightness'),
                grayscale: configuration.get('view.pdf.invertMode.grayscale'),
                hueRotate: configuration.get('view.pdf.invertMode.hueRotate'),
                invert: configuration.get('view.pdf.invert'),
                sepia: configuration.get('view.pdf.invertMode.sepia'),
            },
            color: {
                light: {
                    pageColorsForeground: configuration.get('view.pdf.color.light.pageColorsForeground') || 'CanvasText',
                    pageColorsBackground: configuration.get('view.pdf.color.light.pageColorsBackground') || 'Canvas',
                    backgroundColor: configuration.get('view.pdf.color.light.backgroundColor', '#ffffff'),
                    pageBorderColor: configuration.get('view.pdf.color.light.pageBorderColor', 'lightgrey')
                },
                dark: {
                    pageColorsForeground: configuration.get('view.pdf.color.dark.pageColorsForeground') || 'CanvasText',
                    pageColorsBackground: configuration.get('view.pdf.color.dark.pageColorsBackground') || 'Canvas',
                    backgroundColor: configuration.get('view.pdf.color.dark.backgroundColor', '#ffffff'),
                    pageBorderColor: configuration.get('view.pdf.color.dark.pageBorderColor', 'lightgrey')
                }
            },
            codeColorTheme: (0, theme_1.getCurrentThemeLightness)(),
            keybindings: {
                synctex: configuration.get('view.pdf.internal.synctex.keybinding')
            }
        };
        return pack;
    }
    /**
     * Reveals the position of `record` on the internal PDF viewers.
     *
     * @param pdfFile The path of a PDF file.
     * @param record The position to be revealed.
     */
    syncTeX(pdfFile, record) {
        const pdfFileUri = vscode.Uri.file(pdfFile);
        const clientSet = pdfviewermanager_1.viewerManager.getClientSet(pdfFileUri);
        if (clientSet === undefined) {
            logger.log(`PDF is not viewed: ${pdfFile}`);
            return;
        }
        const needDelay = this.revealWebviewPanel(pdfFileUri);
        for (const client of clientSet) {
            setTimeout(() => {
                client.send({ type: 'synctex', data: record });
            }, needDelay ? 200 : 0);
            logger.log(`Try to synctex ${pdfFile}`);
        }
    }
    /**
     * Reveals the internal PDF viewer of `pdfFileUri`.
     * The first one is revealed.
     *
     * @param pdfFileUri The path of a PDF file.
     * @returns Returns `true` if `WebviewPanel.reveal` called.
     */
    revealWebviewPanel(pdfFileUri) {
        const panelSet = pdfviewermanager_1.viewerManager.getPanelSet(pdfFileUri);
        if (!panelSet) {
            return;
        }
        for (const panel of panelSet) {
            const isSyntexOn = !panel.state || panel.state.synctexEnabled;
            if (panel.webviewPanel.visible && isSyntexOn) {
                return;
            }
        }
        const activeViewColumn = vscode.window.activeTextEditor?.viewColumn;
        for (const panel of panelSet) {
            if (panel.webviewPanel.viewColumn !== activeViewColumn) {
                const isSyntexOn = !panel.state || panel.state.synctexEnabled;
                if (!panel.webviewPanel.visible && isSyntexOn) {
                    panel.webviewPanel.reveal(undefined, true);
                    return true;
                }
                return;
            }
        }
        return;
    }
    /**
     * Returns the state of the internal PDF viewer of `pdfFilePath`.
     *
     * @param pdfFileUri The path of a PDF file.
     */
    getViewerState(pdfFileUri) {
        const panelSet = pdfviewermanager_1.viewerManager.getPanelSet(pdfFileUri);
        if (!panelSet) {
            return [];
        }
        return Array.from(panelSet).map(e => e.state);
    }
}
exports.Viewer = Viewer;
//# sourceMappingURL=viewer.js.map