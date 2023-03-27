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
exports.laCheck = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const lw = __importStar(require("../../lw"));
const linterutils_1 = require("./linterutils");
const convertfilename_1 = require("../../utils/convertfilename");
const logger_1 = require("../logger");
const logger = (0, logger_1.getLogger)('Linter', 'LaCheck');
const linterName = 'LaCheck';
const linterDiagnostics = vscode.languages.createDiagnosticCollection(linterName);
let linterProcess;
function getName() {
    return linterName;
}
async function lintRootFile(rootPath) {
    const stdout = await lacheckWrapper('root', vscode.Uri.file(rootPath), rootPath, undefined);
    if (stdout === undefined) { // It's possible to have empty string as output
        return;
    }
    parseLog(stdout);
}
async function lintFile(document) {
    const filePath = document.fileName;
    const content = document.getText();
    const stdout = await lacheckWrapper('active', document, filePath, content);
    if (stdout === undefined) { // It's possible to have empty string as output
        return;
    }
    parseLog(stdout, document.fileName);
}
async function lacheckWrapper(linterid, configScope, filePath, content) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', configScope);
    const command = configuration.get('linting.lacheck.exec.path');
    let stdout;
    try {
        linterProcess?.kill();
        logger.logCommand(`Linter for ${linterName} command`, command, [filePath]);
        linterProcess = (0, child_process_1.spawn)(command, [filePath], { cwd: path.dirname(filePath) });
        stdout = await (0, linterutils_1.processWrapper)(linterid, linterProcess, content);
    }
    catch (err) {
        if ('stdout' in err) {
            stdout = err.stdout;
        }
        else {
            return;
        }
    }
    return stdout;
}
function parseLog(log, filePath) {
    const linterLog = [];
    const lines = log.split('\n');
    const baseDir = path.dirname(filePath || lw.manager.rootFile || '.');
    for (let index = 0; index < lines.length; index++) {
        const logLine = lines[index];
        const re = /"(.*?)",\sline\s(\d+):\s(<-\s)?(.*)/g;
        const match = re.exec(logLine);
        if (!match) {
            continue;
        }
        if (match[3] === '<- ') {
            const nextLineRe = /.*line\s(\d+).*->\s(.*)/g;
            const nextLineMatch = nextLineRe.exec(lines[index + 1]);
            if (nextLineMatch) {
                linterLog.push({
                    file: path.resolve(baseDir, match[1]),
                    line: parseInt(match[2]),
                    text: `${match[4]} -> ${nextLineMatch[2]} at Line ${nextLineMatch[1]}`
                });
                index++;
            }
            else {
                linterLog.push({
                    file: path.resolve(baseDir, match[1]),
                    line: parseInt(match[2]),
                    text: match[4]
                });
            }
        }
        else {
            linterLog.push({
                file: path.resolve(baseDir, match[1]),
                line: parseInt(match[2]),
                text: match[4]
            });
        }
    }
    logger.log(`Logged ${linterLog.length} messages.`);
    linterDiagnostics.clear();
    showLinterDiagnostics(linterLog);
}
function showLinterDiagnostics(linterLog) {
    const diagsCollection = Object.create(null);
    for (const item of linterLog) {
        const range = new vscode.Range(new vscode.Position(item.line - 1, 0), new vscode.Position(item.line - 1, 65535));
        const diag = new vscode.Diagnostic(range, item.text, vscode.DiagnosticSeverity.Warning);
        diag.source = linterName;
        if (diagsCollection[item.file] === undefined) {
            diagsCollection[item.file] = [];
        }
        diagsCollection[item.file].push(diag);
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    const convEnc = configuration.get('message.convertFilenameEncoding');
    for (const file in diagsCollection) {
        let file1 = file;
        if (['.tex', '.bbx', '.cbx', '.dtx'].includes(path.extname(file))) {
            // Only report LaCheck errors on TeX files. This is done to avoid
            // reporting errors in .sty files, which are irrelevant for most users.
            if (!fs.existsSync(file1) && convEnc) {
                const f = (0, convertfilename_1.convertFilenameEncoding)(file1);
                if (f !== undefined) {
                    file1 = f;
                }
            }
            linterDiagnostics.set(vscode.Uri.file(file1), diagsCollection[file]);
        }
    }
}
exports.laCheck = {
    linterDiagnostics,
    getName,
    lintFile,
    lintRootFile,
    parseLog
};
//# sourceMappingURL=lacheck.js.map