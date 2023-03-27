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
exports.CursorRenderer = void 0;
const vscode = __importStar(require("vscode"));
const latex_utensils_1 = require("latex-utensils");
const parser_1 = require("../../../components/parser");
class CursorRenderer {
    // Test whether cursor is in tex command strings
    // like \begin{...} \end{...} \xxxx{ \[ \] \( \) or \\
    static isCursorInTeXCommand(document) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }
        const cursor = editor.selection.active;
        const r = document.getWordRangeAtPosition(cursor, /\\(?:begin|end|label)\{.*?\}|\\[a-zA-Z]+\{?|\\[()[\]]|\\\\/);
        if (r && r.start.isBefore(cursor) && r.end.isAfter(cursor)) {
            return true;
        }
        return false;
    }
    static getContentRange(node) {
        if (latex_utensils_1.latexParser.hasContentArray(node) && node.content.length > 0) {
            const sloc = node.content[0].location;
            const eloc = node.content[node.content.length - 1].location;
            if (sloc && eloc) {
                const start = { line: sloc.start.line - 1, character: sloc.start.column - 1 };
                const end = { line: eloc.end.line - 1, character: eloc.end.column - 1 };
                return new vscode.Range(start.line, start.character, end.line, end.character);
            }
            else {
                return;
            }
        }
        if (latex_utensils_1.latexParser.isSubscript(node) || latex_utensils_1.latexParser.isSuperscript(node)) {
            const start = { line: node.location.start.line - 1, character: node.location.start.column };
            const end = { line: node.location.end.line - 1, character: node.location.end.column - 1 };
            return new vscode.Range(start.line, start.character, end.line, end.character);
        }
        else {
            if (node.location) {
                const start = { line: node.location.start.line - 1, character: node.location.start.column - 1 };
                const end = { line: node.location.end.line - 1, character: node.location.end.column - 1 };
                return new vscode.Range(start.line, start.character, end.line, end.character);
            }
            else {
                return;
            }
        }
    }
    static cursorPosInSnippet(texMath, cursorPos) {
        const line = cursorPos.line - texMath.range.start.line;
        const character = line === 0 ? cursorPos.character - texMath.range.start.character : cursorPos.character;
        return { line, character };
    }
    static isInAmsMathTextCommand(findResult) {
        let parent = findResult?.parent;
        while (parent) {
            if (latex_utensils_1.latexParser.isAmsMathTextCommand(parent.node)) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }
    static async insertCursor(texMath, cursorPos, cursor) {
        const cursorPosInSnippet = CursorRenderer.cursorPosInSnippet(texMath, cursorPos);
        const arry = texMath.texString.split('\n');
        const findResult = await CursorRenderer.findNodeAt(texMath, cursorPos);
        const cursorNode = findResult?.node;
        if (CursorRenderer.isInAmsMathTextCommand(findResult)) {
            return texMath.texString;
        }
        if (cursorNode) {
            if (latex_utensils_1.latexParser.isCommand(cursorNode)) {
                return texMath.texString;
            }
        }
        if (!cursorNode || !cursorNode.location) {
            const { line, character } = CursorRenderer.cursorPosInSnippet(texMath, cursorPos);
            const curLine = arry[line];
            arry[line] = curLine.substring(0, character) + cursor + curLine.substring(character, curLine.length);
            return arry.join('\n');
        }
        const cursorNodeContentRangeInSnippet = CursorRenderer.getContentRange(cursorNode);
        if (!cursorNodeContentRangeInSnippet) {
            return texMath.texString;
        }
        const nodeStart = cursorNodeContentRangeInSnippet.start;
        const nodeEnd = cursorNodeContentRangeInSnippet.end;
        const line = cursorPosInSnippet.line;
        const curLine = arry[line];
        arry[line] =
            curLine.substring(0, nodeStart.character)
                + (curLine[nodeStart.character - 1] === '{' ? '~' : '{~')
                + curLine.substring(nodeStart.character, cursorPosInSnippet.character)
                + cursor
                + curLine.substring(cursorPosInSnippet.character, nodeEnd.character)
                + (curLine[nodeEnd.character] === '}' ? '~' : '~}')
                + curLine.substring(nodeEnd.character, curLine.length);
        return arry.join('\n');
    }
    static async findNodeAt(texMath, cursorPos) {
        let ast;
        if (texMath.texString === CursorRenderer.currentTeXString && CursorRenderer.currentAst) {
            ast = CursorRenderer.currentAst;
        }
        else {
            ast = await parser_1.parser.parseLatex(texMath.texString, { enableMathCharacterLocation: true });
            CursorRenderer.currentAst = ast;
            CursorRenderer.currentTeXString = texMath.texString;
        }
        if (!ast) {
            return;
        }
        const cursorPosInSnippet = CursorRenderer.cursorPosInSnippet(texMath, cursorPos);
        const cursorLocInSnippet = { line: cursorPosInSnippet.line + 1, column: cursorPosInSnippet.character + 1 };
        const result = latex_utensils_1.latexParser.findNodeAt(ast.content, cursorLocInSnippet);
        return result;
    }
    static async renderCursor(document, texMath, thisColor) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const cursorEnabled = configuration.get('hover.preview.cursor.enabled');
        if (!cursorEnabled) {
            return texMath.texString;
        }
        const texMathRange = texMath.range;
        const cursorPos = vscode.window.activeTextEditor?.selection.active;
        if (!cursorPos) {
            return texMath.texString;
        }
        if (!CursorRenderer.isCursorInsideTexMath(texMathRange, cursorPos)) {
            return texMath.texString;
        }
        if (CursorRenderer.isCursorInTeXCommand(document)) {
            return texMath.texString;
        }
        const symbol = configuration.get('hover.preview.cursor.symbol');
        const color = configuration.get('hover.preview.cursor.color');
        const cursorString = color === 'auto' ? `{\\color{${thisColor}}${symbol}}` : `{\\color{${color}}${symbol}}`;
        return CursorRenderer.insertCursor(texMath, cursorPos, cursorString);
    }
    static isCursorInsideTexMath(texMathRange, cursorPos) {
        return texMathRange.contains(cursorPos) && !texMathRange.start.isEqual(cursorPos) && !texMathRange.end.isEqual(cursorPos);
    }
}
exports.CursorRenderer = CursorRenderer;
//# sourceMappingURL=cursorrenderer.js.map