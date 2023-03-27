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
exports.showCompilerDiagnostics = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const lw = __importStar(require("../../lw"));
const convertfilename_1 = require("../../utils/convertfilename");
function getErrorPosition(item) {
    if (!item.errorPosText) {
        return;
    }
    const content = lw.cacher.get(item.file)?.content;
    if (!content) {
        return;
    }
    // Try to find the errorPosText in the respective line of the document
    const lines = content.split('\n');
    if (lines.length >= item.line) {
        const line = lines[item.line - 1];
        let pos = line.indexOf(item.errorPosText);
        if (pos >= 0) {
            pos += item.errorPosText.length;
            // Find the length of the last word in the error.
            // This is the length of the error-range
            const len = item.errorPosText.length - item.errorPosText.lastIndexOf(' ') - 1;
            if (len > 0) {
                return { start: pos - len, end: pos };
            }
        }
    }
    return;
}
const DIAGNOSTIC_SEVERITY = {
    'typesetting': vscode.DiagnosticSeverity.Information,
    'warning': vscode.DiagnosticSeverity.Warning,
    'error': vscode.DiagnosticSeverity.Error,
};
function showCompilerDiagnostics(diagnostics, buildLog) {
    diagnostics.clear();
    const diagsCollection = Object.create(null);
    for (const item of buildLog) {
        let startChar = 0;
        let endChar = 65535;
        // Try to compute a more precise position
        const preciseErrorPos = getErrorPosition(item);
        if (preciseErrorPos) {
            startChar = preciseErrorPos.start;
            endChar = preciseErrorPos.end;
        }
        const range = new vscode.Range(new vscode.Position(item.line - 1, startChar), new vscode.Position(item.line - 1, endChar));
        const diag = new vscode.Diagnostic(range, item.text, DIAGNOSTIC_SEVERITY[item.type]);
        diag.source = diagnostics.name;
        if (diagsCollection[item.file] === undefined) {
            diagsCollection[item.file] = [];
        }
        diagsCollection[item.file].push(diag);
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    const convEnc = configuration.get('message.convertFilenameEncoding');
    for (const file in diagsCollection) {
        let file1 = file;
        if (!fs.existsSync(file1) && convEnc) {
            const f = (0, convertfilename_1.convertFilenameEncoding)(file1);
            if (f !== undefined) {
                file1 = f;
            }
        }
        diagnostics.set(vscode.Uri.file(file1), diagsCollection[file]);
    }
}
exports.showCompilerDiagnostics = showCompilerDiagnostics;
//# sourceMappingURL=parserutils.js.map