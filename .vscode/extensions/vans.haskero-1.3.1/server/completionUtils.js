"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vsrv = require("vscode-languageserver");
const documentUtils_1 = require("./utils/documentUtils");
const completeAt_1 = require("./intero/commands/completeAt");
const info_1 = require("./intero/commands/info");
const complete_1 = require("./intero/commands/complete");
const identifierKind_1 = require("./intero/identifierKind");
/**
 * Handle completion special cases (import, dot notation, etc.)
 */
class CompletionUtils {
    static toCompletionType(kind) {
        switch (kind) {
            case identifierKind_1.IdentifierKind.Class:
                return vsrv.CompletionItemKind.Class;
            case identifierKind_1.IdentifierKind.Data:
                return vsrv.CompletionItemKind.Enum;
            case identifierKind_1.IdentifierKind.Function:
                return vsrv.CompletionItemKind.Function;
            case identifierKind_1.IdentifierKind.Type:
                return vsrv.CompletionItemKind.Interface;
        }
    }
    static truncResp(word, completion) {
        // the completion response sent back from intero is too wide
        // if | is the cursor when the completion request is triggered:
        // import Control.Concurr|
        // complete request responds completion of the form:
        // Control.Concurrent.Chan
        // if we send back Control.Concurrent.Chan to vscode, it will complete the line of code as :
        // import Control.Control.Concurrent.Chan
        // vscode replaces the current word (unfortunately here . is a word delimiter) with the completionItem
        let i = word.length - 1;
        let leftDotIdx = -1;
        while (leftDotIdx < 0 && i >= 0) {
            if (completion[i] == '.') {
                leftDotIdx = i;
            }
            else {
                i--;
            }
        }
        if (leftDotIdx < 0) {
            return completion;
        }
        else {
            return completion.substr(leftDotIdx + 1);
        }
    }
    static getImportCompletionItems(interoProxy, textDocument, position, line) {
        //if the cursor is after a " as " text, it means that we are in the 'name' area of an import, so we disable module autocompletion
        if (!documentUtils_1.DocumentUtils.leftLineContains(textDocument, position, " as ")) {
            let { word, range } = documentUtils_1.DocumentUtils.getIdentifierAtPosition(textDocument, position, documentUtils_1.NoMatchAtCursorBehaviour.LookLeft);
            const lineToComplete = line.substring(0, position.character);
            const completeRequest = new complete_1.CompleteRequest(textDocument.uri, lineToComplete);
            return completeRequest
                .send(interoProxy)
                .then((response) => {
                return response.completions.map(completion => {
                    return {
                        label: CompletionUtils.truncResp(word, completion),
                        kind: vsrv.CompletionItemKind.Module
                    };
                });
            });
        }
        else {
            return Promise.resolve([]);
        }
    }
    static getDefaultCompletionItems(interoProxy, textDocument, position, maxInfoRequests) {
        let { word, range } = documentUtils_1.DocumentUtils.getIdentifierAtPosition(textDocument, position, documentUtils_1.NoMatchAtCursorBehaviour.LookLeft);
        const completeAtRequest = new completeAt_1.CompleteAtRequest(textDocument.uri, documentUtils_1.DocumentUtils.toInteroRange(range), word);
        //First, get all completion texts
        return completeAtRequest
            .send(interoProxy)
            .then((response) => {
            let completions = response.completions;
            if (completions.length < 1) {
                const completeRequest = new complete_1.CompleteRequest(textDocument.uri, word);
                return completeRequest
                    .send(interoProxy)
                    .then((response) => {
                    return Promise.resolve(response.completions);
                });
            }
            else {
                return Promise.resolve(completions);
            }
        })
            .then(completions => {
            return Promise.all(completions.map((completion, idx) => {
                if (idx < maxInfoRequests) {
                    let infoReq = new info_1.InfoRequest(completion);
                    return infoReq
                        .send(interoProxy)
                        .then((infoResponse) => {
                        var identifier = CompletionUtils.truncResp(word, completion);
                        return Promise.resolve({
                            label: identifier,
                            kind: CompletionUtils.toCompletionType(infoResponse.kind),
                            detail: infoResponse.detail,
                            documentation: infoResponse.documentation,
                            data: completion
                        });
                    });
                }
                else {
                    return Promise.resolve({
                        label: completion,
                        kind: vsrv.CompletionItemKind.Function,
                        data: null
                    });
                }
            }));
        });
    }
    static getResolveInfos(interoProxy, item) {
        //When the global getCompletionItems didn't get details (because it reachs the maxAutoCompletionDetails limit)
        //it returns data = null and label = completion text
        //in this particular case only, we still try to get the details for the completion item
        if (!item.data && item.label) {
            const infoRequest = new info_1.InfoRequest(item.label);
            return infoRequest
                .send(interoProxy)
                .then((infoResponse) => {
                return {
                    label: item.label,
                    kind: CompletionUtils.toCompletionType(infoResponse.kind),
                    detail: infoResponse.detail,
                    documentation: infoResponse.documentation
                };
            });
        }
        else {
            return null;
        }
    }
}
exports.CompletionUtils = CompletionUtils;
//# sourceMappingURL=completionUtils.js.map