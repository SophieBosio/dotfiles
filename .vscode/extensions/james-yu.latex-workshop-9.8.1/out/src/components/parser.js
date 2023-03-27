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
exports.parser = void 0;
const path = __importStar(require("path"));
const workerpool = __importStar(require("workerpool"));
const bibtexlog_1 = require("./parserlib/bibtexlog");
const biberlog_1 = require("./parserlib/biberlog");
const latexlog_1 = require("./parserlib/latexlog");
const utils_1 = require("../utils/utils");
const pool = workerpool.pool(path.join(__dirname, './parserlib/syntax.js'), { minWorkers: 1, maxWorkers: 1, workerType: 'process' });
const proxy = pool.proxy();
function dispose() {
    return {
        dispose: async () => { await pool.terminate(true); }
    };
}
/**
 * Parse a LaTeX file.
 *
 * @param s The content of a LaTeX file to be parsed.
 * @param options
 * @return undefined if parsing fails
 */
async function parseLatex(s, options) {
    return (await proxy).parseLatex(s, options).timeout(3000).catch(() => undefined);
}
async function parseLatexPreamble(s) {
    return (await proxy).parseLatexPreamble(s).timeout(500);
}
async function parseBibtex(s, options) {
    return (await proxy).parseBibtex((0, utils_1.stripComments)(s), options).timeout(30000).catch(() => { return { content: [] }; });
}
// Notice that 'Output written on filename.pdf' isn't output in draft mode.
// https://github.com/James-Yu/LaTeX-Workshop/issues/2893#issuecomment-936312853
const latexPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm;
const latexFatalPattern = /Fatal error occurred, no output PDF file produced!/gm;
const latexmkPattern = /^Latexmk:\sapplying\srule/gm;
const latexmkLog = /^Latexmk:\sapplying\srule/;
const latexmkLogLatex = /^Latexmk:\sapplying\srule\s'(pdf|lua|xe)?latex'/;
const latexmkUpToDate = /^Latexmk: All targets \(.*\) are up-to-date/m;
const texifyPattern = /^running\s(pdf|lua|xe)?latex/gm;
const texifyLog = /^running\s((pdf|lua|xe)?latex|miktex-bibtex)/;
const texifyLogLatex = /^running\s(pdf|lua|xe)?latex/;
const bibtexPattern = /^This is BibTeX, Version.*$/m;
const biberPattern = /^INFO - This is Biber .*$/m;
/**
 * @param log The log message to parse.
 * @param rootFile The current root file.
 * @returns whether the current compilation is indeed a skipped one in latexmk.
 */
function parseLog(log, rootFile) {
    let isLaTeXmkSkipped = false;
    // Canonicalize line-endings
    log = log.replace(/(\r\n)|\r/g, '\n');
    if (log.match(bibtexPattern)) {
        bibtexlog_1.bibtexLogParser.parse(log.match(latexmkPattern) ? trimLaTeXmkBibTeX(log) : log, rootFile);
        bibtexlog_1.bibtexLogParser.showLog();
    }
    else if (log.match(biberPattern)) {
        biberlog_1.biberLogParser.parse(log.match(latexmkPattern) ? trimLaTeXmkBiber(log) : log, rootFile);
        biberlog_1.biberLogParser.showLog();
    }
    if (log.match(latexmkPattern)) {
        log = trimLaTeXmk(log);
    }
    else if (log.match(texifyPattern)) {
        log = trimTexify(log);
    }
    if (log.match(latexPattern) || log.match(latexFatalPattern)) {
        latexlog_1.latexLogParser.parse(log, rootFile);
        latexlog_1.latexLogParser.showLog();
    }
    else if (latexmkSkipped(log)) {
        isLaTeXmkSkipped = true;
    }
    return isLaTeXmkSkipped;
}
function trimLaTeXmk(log) {
    return trimPattern(log, latexmkLogLatex, latexmkLog);
}
function trimLaTeXmkBibTeX(log) {
    return trimPattern(log, bibtexPattern, latexmkLogLatex);
}
function trimLaTeXmkBiber(log) {
    return trimPattern(log, biberPattern, latexmkLogLatex);
}
function trimTexify(log) {
    return trimPattern(log, texifyLogLatex, texifyLog);
}
/**
 * Return the lines between the last occurrences of `beginPattern` and `endPattern`.
 * If `endPattern` is not found, the lines from the last occurrence of
 * `beginPattern` up to the end is returned.
 */
function trimPattern(log, beginPattern, endPattern) {
    const lines = log.split('\n');
    let startLine = -1;
    let finalLine = -1;
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        let result = line.match(beginPattern);
        if (result) {
            startLine = index;
        }
        result = line.match(endPattern);
        if (result) {
            finalLine = index;
        }
    }
    if (finalLine <= startLine) {
        return lines.slice(startLine).join('\n');
    }
    else {
        return lines.slice(startLine, finalLine).join('\n');
    }
}
function latexmkSkipped(log) {
    if (log.match(latexmkUpToDate) && !log.match(latexmkPattern)) {
        latexlog_1.latexLogParser.showLog();
        bibtexlog_1.bibtexLogParser.showLog();
        biberlog_1.biberLogParser.showLog();
        return true;
    }
    return false;
}
exports.parser = {
    parseLatex,
    parseLatexPreamble,
    parseBibtex,
    parseLog,
    dispose
};
//# sourceMappingURL=parser.js.map