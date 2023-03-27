"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const topLevelTypeSignature_1 = require("../commands/topLevelTypeSignature");
const regexpUtils_1 = require("../utils/regexpUtils");
class TopLevelTypeSignatureCA {
    getCommand(textDocument, diag) {
        let pattern = /Top-level binding with no type signature:[\s\r\n]*(.*)/;
        let type = regexpUtils_1.firstGroupOfFirstMatch(diag.message, pattern);
        //message: '    Top-level binding with no type signature: t :: c -> c',
        if (type !== null) {
            return new topLevelTypeSignature_1.TopLevelTypeSignatureInstance(textDocument, diag.range.start.line, 0, type);
        }
        return null;
    }
}
exports.TopLevelTypeSignatureCA = TopLevelTypeSignatureCA;
//# sourceMappingURL=topLevelTypeSignatureCA.js.map