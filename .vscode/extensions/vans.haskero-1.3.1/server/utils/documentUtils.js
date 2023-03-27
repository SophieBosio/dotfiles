'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const interoRange_1 = require("../intero/interoRange");
const fs = require("fs");
const uriUtils_1 = require("./uriUtils");
/**
 * Word at a known position (Range) in the document
 */
class WordSpot {
    constructor(word, range) {
        this.word = word;
        this.range = range;
    }
    get isEmpty() { return this.range.start.character === this.range.end.character && this.range.start.line === this.range.end.line; }
}
exports.WordSpot = WordSpot;
/**
 * Behaviour from cursor position when there is no matching char
 */
var NoMatchAtCursorBehaviour;
(function (NoMatchAtCursorBehaviour) {
    //if char at cursor is not a match, stop
    NoMatchAtCursorBehaviour[NoMatchAtCursorBehaviour["Stop"] = 0] = "Stop";
    //if char at cursor is not a match, looks for one char left
    NoMatchAtCursorBehaviour[NoMatchAtCursorBehaviour["LookLeft"] = 1] = "LookLeft";
    //if char at cursor is not a match, looks for one char right
    NoMatchAtCursorBehaviour[NoMatchAtCursorBehaviour["LookRight"] = 2] = "LookRight";
    //if char at cursor is not a match, looks for one char both sides
    NoMatchAtCursorBehaviour[NoMatchAtCursorBehaviour["LookBoth"] = 3] = "LookBoth";
})(NoMatchAtCursorBehaviour = exports.NoMatchAtCursorBehaviour || (exports.NoMatchAtCursorBehaviour = {}));
/**
 * Tools for document manipulations
 */
class DocumentUtils {
    static isIdentifierSymbol(c) {
        return c.search(DocumentUtils.identifierSymbols) !== -1;
    }
    static getStartingOffset(text, cursorOffset, isValidSymbol, sticky) {
        if (isValidSymbol(text.charAt(cursorOffset)) || sticky === NoMatchAtCursorBehaviour.LookLeft || sticky === NoMatchAtCursorBehaviour.LookBoth) {
            let i = cursorOffset - 1;
            for (i; i >= 0 && isValidSymbol(text.charAt(i)); i--) {
            }
            return i + 1;
        }
        else {
            return cursorOffset;
        }
    }
    static getEndingOffset(text, cursorOffset, isValidSymbol, sticky) {
        if (isValidSymbol(text.charAt(cursorOffset)) || sticky === NoMatchAtCursorBehaviour.LookRight || sticky === NoMatchAtCursorBehaviour.LookBoth) {
            let i = Math.max(0, cursorOffset);
            for (i; i < text.length && isValidSymbol(text.charAt(i)); i++) {
            }
            return i - 1;
        }
        else {
            return cursorOffset;
        }
    }
    /**
     * return text at position, where text is composed of identifier characters
     */
    static getIdentifierAtPosition(document, position, sticky) {
        let text = document.getText();
        let cursorOffset = document.offsetAt(position);
        let startOffset = DocumentUtils.getStartingOffset(text, cursorOffset, DocumentUtils.isIdentifierSymbol, sticky);
        let endOffset = DocumentUtils.getEndingOffset(text, cursorOffset, DocumentUtils.isIdentifierSymbol, sticky);
        let word = text.slice(startOffset, endOffset + 1); //ending offset should be included
        return new WordSpot(word, vscode_languageserver_1.Range.create(document.positionAt(startOffset), document.positionAt(endOffset + 1)));
    }
    static getTextAtRange(document, range) {
        let text = document.getText();
        let startOffset = document.offsetAt(range.start);
        let endOffset = document.offsetAt(range.end);
        return text.slice(startOffset, endOffset);
    }
    /**
     * Returns True if the given position is included in the range
     */
    static isPositionInRange(position, range) {
        if (position === null || range === null) {
            return false;
        }
        if (position.line < range.start.line || position.line > range.end.line ||
            position.character < range.start.character || position.character > range.end.character) {
            return false;
        }
        return true;
    }
    //vscode range are 0 based
    static toVSCodeRange(interoRange) {
        return vscode_languageserver_1.Range.create(interoRange.startLine - 1, interoRange.startCol - 1, interoRange.endLine - 1, interoRange.endCol - 1);
    }
    //intero range are 1 based
    static toInteroRange(range) {
        return new interoRange_1.InteroRange(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
    }
    /**
    * Returns the current text document position line
    */
    static getPositionLine(document, position) {
        const text = document.getText();
        const startingPos = vscode_languageserver_1.Position.create(position.line, 0);
        const endingPos = vscode_languageserver_1.Position.create(position.line, Number.MAX_VALUE);
        const startingOffset = document.offsetAt(startingPos);
        const endingOffset = document.offsetAt(endingPos);
        return text.slice(startingOffset, endingOffset);
    }
    /**
     * Check if the 'text' is present on the left side of the position, in the same line
     */
    static leftLineContains(document, position, text) {
        const line = DocumentUtils.getPositionLine(document, position);
        const leftLine = line.substring(0, position.character);
        return leftLine.indexOf(text) > -1;
    }
    static loadUriFromDisk(uri) {
        return new Promise((resolve, reject) => {
            let text = '';
            let reader = fs.createReadStream(uriUtils_1.UriUtils.toFilePath(uri));
            reader.on('data', (chunk) => {
                text += chunk;
            });
            reader.on('end', () => {
                resolve(vscode_languageserver_1.TextDocument.create(uri, "haskell", 1, text));
            });
            reader.on('error', reason => {
                reject(reason);
            });
        });
    }
}
DocumentUtils.identifierSymbols = /[0-9a-zA-Z_'.]/g;
exports.DocumentUtils = DocumentUtils;
//# sourceMappingURL=documentUtils.js.map