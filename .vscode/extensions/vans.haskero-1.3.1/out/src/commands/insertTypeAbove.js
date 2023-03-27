"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const editorUtils_1 = require("../utils/editorUtils");
/**
 * Command which inserts a line with the type signature of the function under the cursor
 * If the token under the cursor has no type, cancel the command
 */
class InsertTypeAbove {
    constructor(haskeroClient) {
        this.haskeroClient = haskeroClient;
        this.id = "haskero.insertType";
        this.handler = () => {
            let editor = vscode.window.activeTextEditor;
            if (!editor) {
                return; // No open text editor
            }
            let docId = {
                uri: editor.document.uri.toString()
            };
            let hoverParams = {
                textDocument: docId,
                position: editor.selection.start
            };
            //find type information at cursor position in the right document
            //use the language server with the standard protocol
            this.haskeroClient.client.sendRequest("insertTypeAbove", hoverParams)
                .then((hover) => {
                //if the response contains a value field
                if (hover && this.isValued(hover.contents) && hover.contents.value !== "") {
                    let signature = hover.contents.value;
                    editor.edit(this.addSignatureEditBuilder(editor, this.normalizeSignature(signature)));
                }
            }, reason => {
                this.haskeroClient.client.error("Error while inserting type", reason);
            });
        };
    }
    normalizeSignature(signature) {
        return signature.replace(/[\r\n]+/g, '').replace(/[ ]{2,}/g, ' ');
    }
    addSignatureEditBuilder(editor, signature) {
        return (editBuilder) => {
            //find the first char column to align the type signature with the function definition
            let startingColumn = editorUtils_1.EditorUtils.getFirstSymbolFromCurrentPosition(editor);
            //FIXME: handle 'tab based' documents
            let padding = " ".repeat(startingColumn);
            let signatureLine = padding + signature;
            let currentLine = editorUtils_1.EditorUtils.getCurrentLine(editor);
            let insertingPosition = new vscode.Position(currentLine.lineNumber, 0);
            //insert the type signature line where the function defintion is located
            editBuilder.insert(insertingPosition, padding + signature + '\n'); //FIXME: potential bug with windows CR/LF
        };
    }
    //true is markedString contains a value field
    isValued(markedString) {
        return markedString.value !== undefined;
    }
}
exports.InsertTypeAbove = InsertTypeAbove;
//# sourceMappingURL=insertTypeAbove.js.map