'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoUtils_1 = require("../interoUtils");
const uriUtils_1 = require("../../utils/uriUtils");
/**
 * 'complete-at' intero response
 */
class CompleteAtResponse {
    get isOk() {
        return this._isOk;
    }
    get rawout() {
        return this._rawout;
    }
    get rawerr() {
        return this._rawerr;
    }
    get completions() {
        return this._completions;
    }
    constructor(rawout, rawerr) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        this._completions = interoUtils_1.InteroUtils.normalizeRawResponse(rawout).split(/\r?\n/).filter(s => s !== '');
    }
}
exports.CompleteAtResponse = CompleteAtResponse;
/**
 * 'complete-at' intero request
 */
class CompleteAtRequest {
    constructor(uri, range, text) {
        this.uri = uri;
        this.range = range;
        this.text = text;
    }
    send(interoProxy) {
        const filePath = uriUtils_1.UriUtils.toFilePath(this.uri);
        const escapedFilePath = interoUtils_1.InteroUtils.escapeFilePath(filePath);
        const req = `:complete-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.text}`;
        return interoProxy.sendRawRequest(req)
            .then((response) => {
            return Promise.resolve(new CompleteAtResponse(response.rawout, response.rawerr));
        });
    }
}
exports.CompleteAtRequest = CompleteAtRequest;
//# sourceMappingURL=completeAt.js.map