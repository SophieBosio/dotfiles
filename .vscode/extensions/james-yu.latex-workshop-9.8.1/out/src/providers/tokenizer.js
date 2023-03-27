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
exports.onAPackage = exports.tokenizer = void 0;
const vscode = __importStar(require("vscode"));
const utils = __importStar(require("../utils/utils"));
/**
 * If a string on `position` is like `\command`, `\command{` or `\command[`,
 * return `\command`.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
function commandTokenizer(document, position) {
    let startRegex;
    if (document.languageId === 'latex-expl3') {
        startRegex = /\\(?=[^\\{},[\]]*$)/;
    }
    else {
        startRegex = /\\(?=[a-zA-Z]*$)/;
    }
    const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(startRegex);
    if (startResult === null || startResult.index === undefined || startResult.index < 0) {
        return;
    }
    const firstBracket = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[{]/);
    if (firstBracket && firstBracket.index !== undefined && firstBracket.index > 0) {
        return document.getText(new vscode.Range(new vscode.Position(position.line, startResult.index), new vscode.Position(position.line, position.character + firstBracket.index))).trim();
    }
    const wordRange = document.getWordRangeAtPosition(position);
    if (wordRange) {
        return document.getText(wordRange.with(new vscode.Position(position.line, startResult.index))).trim();
    }
    return;
}
/**
 * If a string on `position` surround by `{...}` or `[...]`,
 * return the string inside brackets.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
function argTokenizer(document, position) {
    const startResult = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position)).match(/[{,[](?=[^{},[\]]*$)/);
    if (startResult === null || startResult.index === undefined || startResult.index < 0) {
        return;
    }
    const endResult = document.getText(new vscode.Range(position, new vscode.Position(position.line, 65535))).match(/[}\],]/);
    if (endResult === null || endResult.index === undefined || endResult.index < 0) {
        return;
    }
    return document.getText(new vscode.Range(new vscode.Position(position.line, startResult.index + 1), new vscode.Position(position.line, position.character + endResult.index))).trim();
}
/**
 * If a string on `position` is like `\command{` or `\command[`, then
 * returns the `\command`. If it is like `{...}` or `[...]`, then
 * returns the string inside brackets.
 *
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 */
function tokenizer(document, position) {
    // \command case
    const commandToken = commandTokenizer(document, position);
    if (commandToken) {
        return commandToken;
    }
    // Inside {...} or [...]
    const argToken = argTokenizer(document, position);
    if (argToken) {
        return argToken;
    }
    return;
}
exports.tokenizer = tokenizer;
/**
 * Return `true` if the `position` of the `document` is on a command `\usepackage{...}` including
 * `token`
 * @param document The document to be scanned.
 * @param position The position to be scanned at.
 * @param token The name of package.
 */
function onAPackage(document, position, token) {
    const line = document.lineAt(position.line).text;
    const escapedToken = utils.escapeRegExp(token);
    const regex = new RegExp(`\\\\usepackage(?:\\[[^\\[\\]\\{\\}]*\\])?\\{[\\w,]*${escapedToken}[\\w,]*\\}`);
    if (line.match(regex)) {
        return true;
    }
    return false;
}
exports.onAPackage = onAPackage;
//# sourceMappingURL=tokenizer.js.map