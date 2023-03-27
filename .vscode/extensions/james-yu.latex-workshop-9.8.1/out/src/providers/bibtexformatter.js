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
exports.bibtexFormatterProvider = exports.bibtexFormat = void 0;
const vscode = __importStar(require("vscode"));
const latex_utensils_1 = require("latex-utensils");
const perf_hooks_1 = require("perf_hooks");
const BibtexUtils = __importStar(require("./bibtexformatterlib/bibtexutils"));
const logger_1 = require("../components/logger");
const parser_1 = require("../components/parser");
const logger = (0, logger_1.getLogger)('Format', 'Bib');
const duplicatesDiagnostics = vscode.languages.createDiagnosticCollection('BibTeX');
const diags = [];
async function bibtexFormat(sort, align) {
    if (!vscode.window.activeTextEditor) {
        logger.log('Exit formatting. The active textEditor is undefined.');
        return;
    }
    if (vscode.window.activeTextEditor.document.languageId !== 'bibtex') {
        logger.log('Exit formatting. The active textEditor is not of bibtex type.');
        return;
    }
    const doc = vscode.window.activeTextEditor.document;
    const t0 = perf_hooks_1.performance.now(); // Measure performance
    duplicatesDiagnostics.clear();
    logger.log('Start bibtex formatting on user request.');
    const edits = await formatDocument(doc, sort, align);
    if (edits.length === 0) {
        return;
    }
    const edit = new vscode.WorkspaceEdit();
    edits.forEach(e => {
        edit.replace(doc.uri, e.range, e.newText);
    });
    void vscode.workspace.applyEdit(edit).then(success => {
        if (success) {
            duplicatesDiagnostics.set(doc.uri, diags);
            const t1 = perf_hooks_1.performance.now();
            logger.log(`BibTeX action successful. Took ${t1 - t0} ms.`);
        }
        else {
            void logger.showErrorMessage('Something went wrong while processing the bibliography.');
        }
    });
}
exports.bibtexFormat = bibtexFormat;
async function formatDocument(document, sort, align, range) {
    // Get configuration
    const formatConfig = BibtexUtils.getBibtexFormatConfig(document.uri);
    const config = vscode.workspace.getConfiguration('latex-workshop', document);
    const handleDuplicates = config.get('bibtex-format.handleDuplicates');
    const lineOffset = range ? range.start.line : 0;
    const columnOffset = range ? range.start.character : 0;
    const ast = await parser_1.parser.parseBibtex(document.getText(range)).catch((error) => {
        if (error instanceof (Error)) {
            logger.log('Bibtex parser failed.');
            logger.log(error.message);
            void logger.showErrorMessage('Bibtex parser failed with error: ' + error.message);
        }
        return;
    });
    if (!ast) {
        return [];
    }
    // Create an array of entries and of their starting locations
    const entries = [];
    const entryLocations = [];
    ast.content.forEach(item => {
        if (latex_utensils_1.bibtexParser.isEntry(item) || latex_utensils_1.bibtexParser.isStringEntry(item)) {
            entries.push(item);
            // latex-utilities uses 1-based locations whereas VSCode uses 0-based
            entryLocations.push(new vscode.Range(item.location.start.line - 1, item.location.start.column - 1, item.location.end.line - 1, item.location.end.column - 1));
        }
    });
    // Get the sorted locations
    let sortedEntryLocations = [];
    const duplicates = new Set();
    if (sort) {
        entries.sort(BibtexUtils.bibtexSort(duplicates, formatConfig)).forEach(entry => {
            sortedEntryLocations.push((new vscode.Range(entry.location.start.line - 1, entry.location.start.column - 1, entry.location.end.line - 1, entry.location.end.column - 1)));
        });
    }
    else {
        sortedEntryLocations = entryLocations;
    }
    // Successively replace the text in the current location from the sorted location
    duplicatesDiagnostics.clear();
    const edits = [];
    diags.length = 0;
    let lineDelta = 0;
    let text;
    let isDuplicate;
    for (let i = 0; i < entries.length; i++) {
        if (align && latex_utensils_1.bibtexParser.isEntry(entries[i])) {
            const entry = entries[i];
            text = BibtexUtils.bibtexFormat(entry, formatConfig);
        }
        else {
            text = document.getText(sortedEntryLocations[i]);
        }
        if (latex_utensils_1.bibtexParser.isEntry(entries[i])) {
            const entry = entries[i];
            isDuplicate = duplicates.has(entry);
            if (isDuplicate && handleDuplicates !== 'Ignore Duplicates') {
                if (handleDuplicates === 'Highlight Duplicates') {
                    const highlightRange = new vscode.Range(entryLocations[i].start.line + lineDelta + lineOffset, entryLocations[i].start.character + columnOffset, entryLocations[i].start.line + lineDelta + (sortedEntryLocations[i].end.line - sortedEntryLocations[i].start.line) + lineOffset, entryLocations[i].end.character);
                    diags.push(new vscode.Diagnostic(highlightRange, `Duplicate entry "${entry.internalKey}".`, vscode.DiagnosticSeverity.Warning));
                }
                else { // 'Comment Duplicates'
                    // Log duplicate entry since we aren't highlighting it
                    logger.log(`BibTeX-format: Duplicate entry "${entry.internalKey}" at line ${entryLocations[i].start.line + lineDelta + 1 + lineOffset}.`);
                    text = text.replace(/@/, '');
                }
            }
        }
        // Put text from entry[i] into (sorted)location[i]
        edits.push(new vscode.TextEdit(new vscode.Range(entryLocations[i].start.translate(range?.start.line, range?.start.character), entryLocations[i].end.translate(range?.start.line)), text));
        // We need to figure out the line changes in order to highlight properly
        lineDelta += (sortedEntryLocations[i].end.line - sortedEntryLocations[i].start.line) - (entryLocations[i].end.line - entryLocations[i].start.line);
    }
    logger.log('Formatted ' + document.fileName);
    return edits;
}
class BibtexFormatterProvider {
    provideDocumentFormattingEdits(document, _options, _token) {
        const sort = vscode.workspace.getConfiguration('latex-workshop', document).get('bibtex-format.sort.enabled');
        logger.log('Start bibtex formatting on behalf of VSCode\'s formatter.');
        return formatDocument(document, sort, true);
    }
    provideDocumentRangeFormattingEdits(document, range, _options, _token) {
        const sort = vscode.workspace.getConfiguration('latex-workshop', document).get('bibtex-format.sort.enabled');
        logger.log('Start bibtex selection formatting on behalf of VSCode\'s formatter.');
        return formatDocument(document, sort, true, range);
    }
}
exports.bibtexFormatterProvider = new BibtexFormatterProvider();
//# sourceMappingURL=bibtexformatter.js.map