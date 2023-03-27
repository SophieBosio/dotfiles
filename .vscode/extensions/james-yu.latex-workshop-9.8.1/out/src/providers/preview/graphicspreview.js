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
exports.GraphicsPreview = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lw = __importStar(require("../../lw"));
const logger_1 = require("../../components/logger");
const logger = (0, logger_1.getLogger)('Preview', 'Graphics');
class GraphicsPreview {
    async provideHover(document, position) {
        const pat = /\\includegraphics\s*(?:\[(.*?)\])?\s*\{(.*?)\}/;
        const range = document.getWordRangeAtPosition(position, pat);
        if (!range) {
            return;
        }
        const cmdString = document.getText(range);
        const execArray = pat.exec(cmdString);
        const relPath = execArray && execArray[2];
        const includeGraphicsArgs = execArray && execArray[1];
        if (!execArray || !relPath) {
            return;
        }
        const filePath = this.findFilePath(relPath, document);
        if (filePath === undefined) {
            return;
        }
        let pageNumber = 1;
        if (includeGraphicsArgs) {
            const m = /page\s*=\s*(\d+)/.exec(includeGraphicsArgs);
            if (m && m[1]) {
                pageNumber = Number(m[1]);
            }
        }
        const md = await this.renderGraphicsAsMarkdownString(filePath, { height: 230, width: 500, pageNumber });
        if (md !== undefined) {
            return new vscode.Hover(md, range);
        }
        return;
    }
    async renderGraphicsAsMarkdownString(filePath, opts) {
        const filePathUriString = vscode.Uri.file(filePath).toString();
        if (/\.(bmp|jpg|jpeg|gif|png)$/i.exec(filePath)) {
            // Workaround for https://github.com/microsoft/vscode/issues/137632
            if (vscode.env.remoteName) {
                const md = new vscode.MarkdownString(`![img](${filePathUriString})`);
                return md;
            }
            const md = new vscode.MarkdownString(`<img src="${filePathUriString}" height="${opts.height}">`);
            md.supportHtml = true;
            return md;
        }
        if (/\.pdf$/i.exec(filePath)) {
            const pdfOpts = { height: opts.height, width: opts.width, pageNumber: opts.pageNumber || 1 };
            const dataUrl = await this.renderPdfFileAsDataUrl(filePath, pdfOpts);
            if (dataUrl !== undefined) {
                const md = new vscode.MarkdownString(`<img src="${dataUrl}" height="${opts.height}">`);
                md.supportHtml = true;
                return md;
            }
            else {
                let msg = '$(error) Failed to render.';
                if (!vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath))) {
                    msg = '$(warning) Cannot render a PDF file not in workspaces.';
                }
                else if (!lw.snippetView.snippetViewProvider.webviewView) {
                    msg = '$(info) Please activate Snippet View to render the thumbnail of a PDF file.';
                }
                return new vscode.MarkdownString(msg, true);
            }
        }
        return;
    }
    async renderPdfFileAsDataUrl(pdfFilePath, opts) {
        try {
            const maxDataUrlLength = 99980;
            let scale = 1.5;
            let newOpts = { height: opts.height * scale, width: opts.width * scale, pageNumber: opts.pageNumber };
            let dataUrl = await lw.snippetView.renderPdf(vscode.Uri.file(pdfFilePath), newOpts);
            if (!dataUrl || dataUrl.length < maxDataUrlLength) {
                return dataUrl;
            }
            scale = 1;
            newOpts = { height: opts.height * scale, width: opts.width * scale, pageNumber: opts.pageNumber };
            dataUrl = await lw.snippetView.renderPdf(vscode.Uri.file(pdfFilePath), newOpts);
            if (!dataUrl || dataUrl.length < maxDataUrlLength) {
                return dataUrl;
            }
            scale = Math.sqrt(maxDataUrlLength / dataUrl.length) / 1.2;
            newOpts = { height: opts.height * scale, width: opts.width * scale, pageNumber: opts.pageNumber };
            dataUrl = await lw.snippetView.renderPdf(vscode.Uri.file(pdfFilePath), newOpts);
            if (dataUrl && dataUrl.length >= maxDataUrlLength) {
                logger.log(`Data URL still too large: ${pdfFilePath}`);
                return;
            }
            return dataUrl;
        }
        catch (e) {
            logger.logError(`Failed rendering graphics as data url with ${pdfFilePath}`, e);
            return;
        }
    }
    findFilePath(relPath, document) {
        if (path.isAbsolute(relPath)) {
            if (fs.existsSync(relPath)) {
                return relPath;
            }
            else {
                return;
            }
        }
        const activeDir = path.dirname(document.uri.fsPath);
        for (const dirPath of lw.completer.input.graphicsPath) {
            const filePath = path.resolve(activeDir, dirPath, relPath);
            if (fs.existsSync(filePath)) {
                return filePath;
            }
        }
        const fPath = path.resolve(activeDir, relPath);
        if (fs.existsSync(fPath)) {
            return fPath;
        }
        const rootDir = lw.manager.rootDir;
        if (rootDir === undefined) {
            return;
        }
        const frPath = path.resolve(rootDir, relPath);
        if (fs.existsSync(frPath)) {
            return frPath;
        }
        return;
    }
}
exports.GraphicsPreview = GraphicsPreview;
//# sourceMappingURL=graphicspreview.js.map