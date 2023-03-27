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
exports.BibTeXStructure = void 0;
const vscode = __importStar(require("vscode"));
const latex_utensils_1 = require("latex-utensils");
const section_1 = require("./section");
const parser_1 = require("../../components/parser");
const logger_1 = require("../../components/logger");
const logger = (0, logger_1.getLogger)('Structure', 'BibTeX');
class BibTeXStructure {
    static async buildBibTeXModel(document) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(document.fileName));
        if (document.getText().length >= configuration.get('bibtex.maxFileSize') * 1024 * 1024) {
            logger.log(`Bib file is too large, ignoring it: ${document.fileName}`);
            return [];
        }
        const ast = await parser_1.parser.parseBibtex(document.getText()).catch((e) => {
            if (latex_utensils_1.bibtexParser.isSyntaxError(e)) {
                const line = e.location.start.line;
                logger.log(`Error parsing BibTeX: line ${line} in ${document.fileName} .`);
            }
            return;
        });
        const ds = [];
        ast?.content.filter(latex_utensils_1.bibtexParser.isEntry)
            .forEach(entry => {
            const bibitem = new section_1.Section(section_1.SectionKind.BibItem, `${entry.entryType}: ${entry.internalKey}`, vscode.TreeItemCollapsibleState.Collapsed, 0, entry.location.start.line - 1, // ast line numbers start at 1
            entry.location.end.line - 1, document.fileName);
            entry.content.forEach(field => {
                const fielditem = new section_1.Section(section_1.SectionKind.BibField, `${field.name}: ${field.value.content}`, vscode.TreeItemCollapsibleState.None, 1, field.location.start.line - 1, field.location.end.line - 1, document.fileName);
                fielditem.parent = bibitem;
                bibitem.children.push(fielditem);
            });
            ds.push(bibitem);
        });
        return ds;
    }
}
exports.BibTeXStructure = BibTeXStructure;
//# sourceMappingURL=bibtex.js.map