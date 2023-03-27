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
exports.MathPreview = void 0;
const vscode = __importStar(require("vscode"));
const mathjaxpool_1 = require("./mathjaxpool");
const utils = __importStar(require("../../utils/svg"));
const theme_1 = require("../../utils/theme");
const cursorrenderer_1 = require("./mathpreviewlib/cursorrenderer");
const textdocumentlike_1 = require("./mathpreviewlib/textdocumentlike");
const newcommandfinder_1 = require("./mathpreviewlib/newcommandfinder");
const texmathenvfinder_1 = require("./mathpreviewlib/texmathenvfinder");
const hoverpreviewonref_1 = require("./mathpreviewlib/hoverpreviewonref");
const mathpreviewutils_1 = require("./mathpreviewlib/mathpreviewutils");
const logger_1 = require("../../components/logger");
const logger = (0, logger_1.getLogger)('Preview', 'Math');
class MathPreview {
    constructor() {
        this.color = '#000000';
        vscode.workspace.onDidChangeConfiguration(() => this.getColor());
        mathjaxpool_1.MathJaxPool.initialize();
    }
    findProjectNewCommand(ctoken) {
        return newcommandfinder_1.NewCommandFinder.findProjectNewCommand(ctoken);
    }
    async provideHoverOnTex(document, tex, newCommand) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const scale = configuration.get('hover.preview.scale');
        let s = await cursorrenderer_1.CursorRenderer.renderCursor(document, tex, this.color);
        s = mathpreviewutils_1.MathPreviewUtils.mathjaxify(s, tex.envname);
        const typesetArg = newCommand + mathpreviewutils_1.MathPreviewUtils.stripTeX(s, newCommand);
        const typesetOpts = { scale, color: this.color };
        try {
            const xml = await mathjaxpool_1.MathJaxPool.typeset(typesetArg, typesetOpts);
            const md = utils.svgToDataUrl(xml);
            return new vscode.Hover(new vscode.MarkdownString(mathpreviewutils_1.MathPreviewUtils.addDummyCodeBlock(`![equation](${md})`)), tex.range);
        }
        catch (e) {
            logger.logError(`Failed rendering MathJax ${typesetArg} .`, e);
            throw e;
        }
    }
    async provideHoverOnRef(document, position, refData, token, ctoken) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const line = refData.position.line;
        const link = vscode.Uri.parse('command:latex-workshop.synctexto').with({ query: JSON.stringify([line, refData.file]) });
        const mdLink = new vscode.MarkdownString(`[View on pdf](${link})`);
        mdLink.isTrusted = true;
        if (configuration.get('hover.ref.enabled')) {
            const tex = texmathenvfinder_1.TeXMathEnvFinder.findHoverOnRef(document, position, refData, token);
            if (tex) {
                const newCommands = await this.findProjectNewCommand(ctoken);
                return hoverpreviewonref_1.HoverPreviewOnRefProvider.provideHoverPreviewOnRef(tex, newCommands, refData, this.color);
            }
        }
        const md = '```latex\n' + refData.documentation + '\n```\n';
        const refRange = document.getWordRangeAtPosition(position, /\{.*?\}/);
        const refNumberMessage = this.refNumberMessage(refData);
        if (refNumberMessage !== undefined && configuration.get('hover.ref.number.enabled')) {
            return new vscode.Hover([md, refNumberMessage, mdLink], refRange);
        }
        return new vscode.Hover([md, mdLink], refRange);
    }
    refNumberMessage(refData) {
        if (refData.prevIndex) {
            const refNum = refData.prevIndex.refNumber;
            const refMessage = `numbered ${refNum} at last compilation`;
            return refMessage;
        }
        return;
    }
    async generateSVG(tex, newCommandsArg) {
        const newCommands = newCommandsArg ?? await newcommandfinder_1.NewCommandFinder.findProjectNewCommand();
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const scale = configuration.get('hover.preview.scale');
        const s = mathpreviewutils_1.MathPreviewUtils.mathjaxify(tex.texString, tex.envname);
        const xml = await mathjaxpool_1.MathJaxPool.typeset(newCommands + mathpreviewutils_1.MathPreviewUtils.stripTeX(s, newCommands), { scale, color: this.color });
        return { svgDataUrl: utils.svgToDataUrl(xml), newCommands };
    }
    getColor() {
        const lightness = (0, theme_1.getCurrentThemeLightness)();
        if (lightness === 'light') {
            this.color = '#000000';
        }
        else {
            this.color = '#ffffff';
        }
    }
    renderCursor(document, texMath) {
        return cursorrenderer_1.CursorRenderer.renderCursor(document, texMath, this.color);
    }
    findHoverOnTex(document, position) {
        return texmathenvfinder_1.TeXMathEnvFinder.findHoverOnTex(document, position);
    }
    findHoverOnRef(refData, token) {
        const document = textdocumentlike_1.TextDocumentLike.load(refData.file);
        const position = refData.position;
        return texmathenvfinder_1.TeXMathEnvFinder.findHoverOnRef(document, position, refData, token);
    }
    async renderSvgOnRef(tex, refData, ctoken) {
        const newCommand = await this.findProjectNewCommand(ctoken);
        return hoverpreviewonref_1.HoverPreviewOnRefProvider.renderSvgOnRef(tex, newCommand, refData, this.color);
    }
    findMathEnvIncludingPosition(document, position) {
        return texmathenvfinder_1.TeXMathEnvFinder.findMathEnvIncludingPosition(document, position);
    }
}
exports.MathPreview = MathPreview;
//# sourceMappingURL=mathpreview.js.map