"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vsrv = require("vscode-languageserver");
const typeAt_1 = require("../intero/commands/typeAt");
class TopLevelTypeSignature {
    constructor() {
        this.title = "Add top level signature";
        this.command = "TopLevelTypeSignatureCmd";
    }
    instanciate(args) {
        return new TopLevelTypeSignatureInstance(args[0], args[1], args[2], args[3]);
    }
}
exports.TopLevelTypeSignature = TopLevelTypeSignature;
class TopLevelTypeSignatureInstance extends TopLevelTypeSignature {
    constructor(textDocument, line, col, type) {
        super();
        this.textDocument = textDocument;
        this.line = line;
        this.col = col;
        this.type = type;
        this.arguments = new Array();
        this.arguments.push(textDocument, line, col, type);
    }
    execute(workSpace, documents, haskeroService) {
        let textDocument = documents.get(this.textDocument.uri);
        //we dont use the type info extracted from the warning because it uses 'forall' syntaxe to describe the signature
        //so we use haskero service to get a better type info
        haskeroService.getHoverInformation(textDocument, vsrv.Position.create(this.line, this.col), typeAt_1.TypeInfoKind.Generic)
            .then((hover) => {
            let myHover = hover.contents;
            let edit = vsrv.TextEdit.insert(vsrv.Position.create(this.line, this.col), myHover.value + '\n');
            let wse = {
                changes: {
                    [this.textDocument.uri]: [edit]
                }
            };
            return workSpace.applyEdit(wse).then(resp => Promise.resolve(resp), reason => Promise.reject(reason));
        })
            .then(response => {
        })
            .catch(reason => {
            console.log("Cannot apply insert top-level signature command: ");
            console.dir(reason);
        });
    }
}
exports.TopLevelTypeSignatureInstance = TopLevelTypeSignatureInstance;
//# sourceMappingURL=topLevelTypeSignature.js.map