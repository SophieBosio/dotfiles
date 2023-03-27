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
exports.DocTeXStructure = void 0;
const vscode = __importStar(require("vscode"));
const utils = __importStar(require("../../utils/utils"));
const latex_utensils_1 = require("latex-utensils");
const parser_1 = require("../../components/parser");
const logger_1 = require("../../components/logger");
const latex_1 = require("./latex");
const logger = (0, logger_1.getLogger)('Structure', 'DocTeX');
class DocTeXStructure extends latex_1.LaTeXStructure {
    static async buildDocTeXModel(document) {
        const content = document.getText();
        if (!content) {
            return [];
        }
        const docContent = DocTeXStructure.getDoc(content);
        const sections = await DocTeXStructure.getToC(document, content, docContent);
        return sections;
    }
    static getDoc(content) {
        const mode = ['NORMAL'];
        const comment = /(^|[^\\]|(?:(?<!\\)(?:\\\\)+))\^\^A.*$/gm;
        return content.split('\n').map(line => {
            if (line.match(/%\s*\^\^A/)) {
                return '';
            }
            else if (line.match(/%\s*\\iffalse/)) {
                mode.push('COMMENT');
            }
            else if (line.match(/%\s*\\fi/) && mode[mode.length - 1] === 'COMMENT') {
                mode.pop();
            }
            else if (mode[mode.length - 1] === 'COMMENT') {
                return '';
            }
            else if (line.startsWith('%%')) {
                return '';
            }
            else if (line.startsWith('%    \\begin{macrocode}')) {
                mode.push('MACROCODE');
            }
            else if (line.startsWith('%    \\end{macrocode}') && mode[mode.length - 1] === 'MACROCODE') {
                mode.pop();
            }
            else if (mode[mode.length - 1] === 'MACROCODE') {
                return '';
            }
            else if (line.startsWith('%')) {
                return line.slice(1).replace(comment, '$1').replaceAll('\\verb', '');
            }
            return '';
        }).join('\n');
    }
    static async getToC(document, content, docContent) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const fastparse = configuration.get('intellisense.fastparse.enabled');
        const ast = await parser_1.parser.parseLatex(fastparse ? utils.stripText(docContent) : content).catch((e) => {
            if (latex_utensils_1.latexParser.isSyntaxError(e)) {
                const line = e.location.start.line;
                logger.log(`Error parsing dirty AST of active editor at line ${line}. Fallback to cache.`);
            }
            return undefined;
        });
        if (!ast) {
            return [];
        }
        DocTeXStructure.refreshLaTeXModelConfig(['macro', 'environment']);
        // Parse each base-level node. If the node has contents, that function
        // will be called recursively.
        let flatNodes = [];
        for (const node of ast.content) {
            flatNodes = [
                ...flatNodes,
                ...await DocTeXStructure.parseLaTeXNode(node, document.fileName, false, new Set())
            ];
        }
        DocTeXStructure.normalizeDepths(flatNodes);
        DocTeXStructure.buildFloatNumber(flatNodes, false);
        const { preambleFloats, flatSections } = DocTeXStructure.buildSectionNumber(flatNodes, false);
        const preamble = DocTeXStructure.buildNestedFloats(preambleFloats, flatSections);
        const sections = DocTeXStructure.buildNestedSections(flatSections);
        const structure = [...preamble, ...sections];
        DocTeXStructure.buildLaTeXSectionToLine(structure, Number.MAX_SAFE_INTEGER);
        return sections;
    }
}
exports.DocTeXStructure = DocTeXStructure;
//# sourceMappingURL=doctex.js.map