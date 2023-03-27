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
exports.HoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("../lw"));
const tokenizer_1 = require("./tokenizer");
class HoverProvider {
    async provideHover(document, position, ctoken) {
        lw.mathPreview.getColor();
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const hov = configuration.get('hover.preview.enabled');
        const hovReference = configuration.get('hover.ref.enabled');
        const hovCitation = configuration.get('hover.citation.enabled');
        const hovCommand = configuration.get('hover.command.enabled');
        if (hov) {
            const tex = lw.mathPreview.findHoverOnTex(document, position);
            if (tex) {
                const newCommands = await lw.mathPreview.findProjectNewCommand(ctoken);
                const hover = await lw.mathPreview.provideHoverOnTex(document, tex, newCommands);
                return hover;
            }
            const graphicsHover = await lw.graphicsPreview.provideHover(document, position);
            if (graphicsHover) {
                return graphicsHover;
            }
        }
        const token = (0, tokenizer_1.tokenizer)(document, position);
        if (!token) {
            return;
        }
        // Test if we are on a command
        if (token.startsWith('\\')) {
            if (!hovCommand) {
                return;
            }
            return this.provideHoverOnCommand(token);
        }
        if ((0, tokenizer_1.onAPackage)(document, position, token)) {
            const packageName = encodeURIComponent(JSON.stringify(token));
            const md = `Package **${token}** \n\n`;
            const mdLink = new vscode.MarkdownString(`[View documentation](command:latex-workshop.texdoc?${packageName})`);
            mdLink.isTrusted = true;
            const ctanUrl = `https://ctan.org/pkg/${token}`;
            const ctanLink = new vscode.MarkdownString(`[${ctanUrl}](${ctanUrl})`);
            return new vscode.Hover([md, mdLink, ctanLink]);
        }
        const refData = lw.completer.reference.getRef(token);
        if (hovReference && refData) {
            const hover = await lw.mathPreview.provideHoverOnRef(document, position, refData, token, ctoken);
            return hover;
        }
        const cite = lw.completer.citation.getEntryWithDocumentation(token, document.uri);
        if (hovCitation && cite) {
            const range = document.getWordRangeAtPosition(position, /\{.*?\}/);
            const md = cite.documentation || cite.detail;
            if (md) {
                return new vscode.Hover(md, range);
            }
        }
        return;
    }
    provideHoverOnCommand(token) {
        const signatures = [];
        const packageNames = [];
        const tokenWithoutSlash = token.substring(1);
        lw.cacher.getIncludedTeX().forEach(cachedFile => {
            const cachedCmds = lw.cacher.get(cachedFile)?.elements.command;
            if (cachedCmds === undefined) {
                return;
            }
            cachedCmds.forEach(cmd => {
                const cmdName = cmd.name();
                if (cmdName.startsWith(tokenWithoutSlash) && (cmdName.length === tokenWithoutSlash.length)) {
                    if (typeof cmd.documentation !== 'string') {
                        return;
                    }
                    const doc = cmd.documentation;
                    const packageName = cmd.package;
                    if (packageName && packageName !== 'user-defined' && (!packageNames.includes(packageName))) {
                        packageNames.push(packageName);
                    }
                    signatures.push(doc);
                }
            });
        });
        let pkgLink = '';
        if (packageNames.length > 0) {
            pkgLink = '\n\nView documentation for package(s) ';
            packageNames.forEach(p => {
                const packageName = encodeURIComponent(JSON.stringify(p));
                pkgLink += `[${p}](command:latex-workshop.texdoc?${packageName}),`;
            });
            pkgLink = pkgLink.substring(0, pkgLink.lastIndexOf(',')) + '.';
        }
        if (signatures.length > 0) {
            const mdLink = new vscode.MarkdownString(signatures.join('  \n')); // We need two spaces to ensure md newline
            mdLink.appendMarkdown(pkgLink);
            mdLink.isTrusted = true;
            return new vscode.Hover(mdLink);
        }
        return;
    }
}
exports.HoverProvider = HoverProvider;
//# sourceMappingURL=hover.js.map