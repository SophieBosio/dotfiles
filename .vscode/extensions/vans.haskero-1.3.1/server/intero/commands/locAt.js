'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoRange_1 = require("../interoRange");
const interoUtils_1 = require("../interoUtils");
const uriUtils_1 = require("../../utils/uriUtils");
/**
 * loc-at intero response
 */
class LocAtResponse {
    static get pattern() { return new RegExp('(.*):\\((\\d+),(\\d+)\\)-\\((\\d+),(\\d+)\\)'); }
    get filePath() {
        return this._filePath;
    }
    get range() {
        return this._range;
    }
    get isOk() {
        return this._isOk;
    }
    get rawout() {
        return this._rawout;
    }
    get rawerr() {
        return this._rawerr;
    }
    constructor(rawout, rawerr) {
        this._rawout = rawout;
        this._rawerr = rawerr;
        let match = LocAtResponse.pattern.exec(rawout);
        if (match != null) {
            this._filePath = match[1];
            this._range = new interoRange_1.InteroRange(+match[2], +match[3], +match[4], +match[5]);
            this._isOk = true;
        }
        else {
            this._isOk = false;
        }
    }
}
exports.LocAtResponse = LocAtResponse;
/**
 * loc-at intero request
 */
class LocAtRequest {
    constructor(uri, range, identifier) {
        this.uri = uri;
        this.range = range;
        this.identifier = identifier;
    }
    send(interoProxy) {
        const filePath = uriUtils_1.UriUtils.toFilePath(this.uri);
        const escapedFilePath = interoUtils_1.InteroUtils.escapeFilePath(filePath);
        //load the file first, otherwise it won't match the last version on disk
        //TODO replace :l with :module +Module
        const load = `:l ${escapedFilePath}`;
        const req = `:loc-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.identifier}`;
        return interoProxy.sendRawRequest(load)
            .then((response) => {
            return interoProxy.sendRawRequest(req);
        })
            .then((response) => {
            return Promise.resolve(new LocAtResponse(response.rawout, response.rawerr));
        });
    }
}
exports.LocAtRequest = LocAtRequest;
//# sourceMappingURL=locAt.js.map