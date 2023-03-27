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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TextDocumentLike_lines, _TextDocumentLike_eol;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextDocumentLike = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
class TextDocumentLike {
    static load(filePath) {
        const uri = vscode.Uri.file(filePath);
        const editor = vscode.window.activeTextEditor;
        if (editor !== undefined && editor.document.uri.fsPath === uri.fsPath) {
            return editor.document;
        }
        for (const doc of vscode.workspace.textDocuments) {
            if (doc.uri.fsPath === uri.fsPath) {
                return doc;
            }
        }
        return new TextDocumentLike(fs.readFileSync(filePath).toString());
    }
    constructor(s) {
        _TextDocumentLike_lines.set(this, void 0);
        _TextDocumentLike_eol.set(this, void 0);
        if (s.match(/\r\n/)) {
            __classPrivateFieldSet(this, _TextDocumentLike_eol, '\r\n', "f");
        }
        else if (s.match(/\n/)) {
            __classPrivateFieldSet(this, _TextDocumentLike_eol, '\n', "f");
        }
        else {
            const editor = vscode.window.activeTextEditor;
            if (editor === undefined || editor.document.eol === vscode.EndOfLine.LF) {
                __classPrivateFieldSet(this, _TextDocumentLike_eol, '\n', "f");
            }
            else {
                __classPrivateFieldSet(this, _TextDocumentLike_eol, '\r\n', "f");
            }
        }
        __classPrivateFieldSet(this, _TextDocumentLike_lines, s.split(__classPrivateFieldGet(this, _TextDocumentLike_eol, "f")), "f");
    }
    get lineCount() {
        return __classPrivateFieldGet(this, _TextDocumentLike_lines, "f").length;
    }
    getText(range) {
        if (range === undefined) {
            return __classPrivateFieldGet(this, _TextDocumentLike_lines, "f").join(__classPrivateFieldGet(this, _TextDocumentLike_eol, "f"));
        }
        let ret = '';
        let line;
        const startLineNum = range.start.line;
        const endLineNum = range.end.line;
        if (this.lineCount <= startLineNum) {
            return '';
        }
        if (startLineNum === endLineNum) {
            line = __classPrivateFieldGet(this, _TextDocumentLike_lines, "f")[startLineNum];
            return line.slice(range.start.character, range.end.character);
        }
        line = __classPrivateFieldGet(this, _TextDocumentLike_lines, "f")[startLineNum];
        ret += line.slice(range.start.character);
        for (let i = startLineNum + 1; i < endLineNum; i++) {
            ret += __classPrivateFieldGet(this, _TextDocumentLike_eol, "f") + __classPrivateFieldGet(this, _TextDocumentLike_lines, "f")[i];
        }
        ret += __classPrivateFieldGet(this, _TextDocumentLike_eol, "f") + __classPrivateFieldGet(this, _TextDocumentLike_lines, "f")[endLineNum].slice(0, range.end.character);
        return ret;
    }
    getWordRangeAtPosition(position, regex = /(-?\d.\d\w)|([^`~!@#%^&*()\-=+[{\]}|;:'",.<>/?\s]+)/g) {
        if (position.line > this.lineCount) {
            return;
        }
        const line = __classPrivateFieldGet(this, _TextDocumentLike_lines, "f")[position.line];
        for (let i = position.character; i >= 0; i--) {
            const tmp = line.slice(i);
            const m = tmp.match(regex);
            if (m !== null) {
                return new vscode.Range(position.line, i, position.line, i + m[0].length);
            }
        }
        return;
    }
    lineAt(lineNum) {
        if (typeof lineNum === 'number') {
            return new TextLineLike(__classPrivateFieldGet(this, _TextDocumentLike_lines, "f")[lineNum]);
        }
        else {
            return new TextLineLike(__classPrivateFieldGet(this, _TextDocumentLike_lines, "f")[lineNum.line]);
        }
    }
}
exports.TextDocumentLike = TextDocumentLike;
_TextDocumentLike_lines = new WeakMap(), _TextDocumentLike_eol = new WeakMap();
class TextLineLike {
    constructor(s) {
        this.text = s;
    }
}
//# sourceMappingURL=textdocumentlike.js.map