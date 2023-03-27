"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Utilities to handle a TextEditor
 */
class EditorUtils {
    /**
     * True is 'c' is a symbol char used in the haskell language
     */
    static isIdentifierSymbol(c) {
        return c.search(EditorUtils.identifierSymbols) !== -1;
    }
    /**
     * Returns the leftmost symbol index (0-based) of the given line offset
     */
    static findStartingColumn(line, currentCol) {
        let col = currentCol;
        while (col >= 0 && EditorUtils.isIdentifierSymbol(line.charAt(col))) {
            col--;
        }
        return col + 1;
    }
    /**
     * Returns the current editor position line
     */
    static getCurrentLine(editor) {
        return editor.document.lineAt(editor.selection.start.line);
    }
    /**
     * Returns the leftmost symbol index (0-based) of the gcurrent position in the editor
     */
    static getFirstSymbolFromCurrentPosition(editor) {
        let currentLine = EditorUtils.getCurrentLine(editor);
        let currentPos = editor.selection.start;
        let startingColumn = EditorUtils.findStartingColumn(currentLine.text, currentPos.character);
        return startingColumn;
    }
}
EditorUtils.identifierSymbols = /[0-9a-zA-Z_']/g;
exports.EditorUtils = EditorUtils;
//# sourceMappingURL=editorUtils.js.map