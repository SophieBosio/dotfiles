'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var InteroDiagnosticKind;
(function (InteroDiagnosticKind) {
    InteroDiagnosticKind[InteroDiagnosticKind["warning"] = 0] = "warning";
    InteroDiagnosticKind[InteroDiagnosticKind["error"] = 1] = "error";
})(InteroDiagnosticKind = exports.InteroDiagnosticKind || (exports.InteroDiagnosticKind = {}));
/**
 * An intero diagnostic : warning or error
 */
class InteroDiagnostic {
    constructor(filePath, line, col, message, kind) {
        this.filePath = filePath;
        this.line = line;
        this.col = col;
        this.message = message;
        this.kind = kind;
        this.line = line - 1;
        this.col = col - 1;
    }
}
exports.InteroDiagnostic = InteroDiagnostic;
//# sourceMappingURL=interoDiagnostic.js.map