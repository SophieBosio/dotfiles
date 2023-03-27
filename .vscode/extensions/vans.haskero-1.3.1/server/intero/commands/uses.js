'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoRange_1 = require("../interoRange");
const interoUtils_1 = require("../interoUtils");
const interoLocation_1 = require("../interoLocation");
const uriUtils_1 = require("../../utils/uriUtils");
const regexpUtils_1 = require("../../utils/regexpUtils");
/**
 * uses intero response
 */
class UsesResponse {
    constructor(rawout, rawerr) {
        this.rawout = rawout;
        this.rawerr = rawerr;
        const toInteroLoc = (match) => {
            return new interoLocation_1.InteroLocation(match[1], new interoRange_1.InteroRange(+match[2], +match[3], +match[4], +match[5]));
        };
        const pattern = /(.*):\((\d+),(\d+)\)-\((\d+),(\d+)\)/gi;
        let matches = regexpUtils_1.allMatchs(rawout, pattern);
        if (matches.length > 1) {
            this._locations = matches.map(toInteroLoc);
            this._isOk = true;
        }
        else {
            this._isOk = false;
        }
    }
    get isOk() {
        return this._isOk;
    }
    get locations() {
        return this._locations;
    }
}
exports.UsesResponse = UsesResponse;
/**
 * uses intero request
 */
class UsesRequest {
    constructor(uri, range, identifier) {
        this.uri = uri;
        this.range = range;
        this.identifier = identifier;
    }
    send(interoProxy) {
        const filePath = uriUtils_1.UriUtils.toFilePath(this.uri);
        const escapedFilePath = interoUtils_1.InteroUtils.escapeFilePath(filePath);
        //load the file first, otherwise it won't match the last version on disk
        const load = `:l ${escapedFilePath}`;
        const req = `:uses ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol} ${this.identifier}`;
        return interoProxy.sendRawRequest(load)
            .then((response) => {
            return interoProxy.sendRawRequest(req);
        })
            .then((response) => {
            return Promise.resolve(new UsesResponse(response.rawout, response.rawerr));
        });
    }
}
exports.UsesRequest = UsesRequest;
//# sourceMappingURL=uses.js.map