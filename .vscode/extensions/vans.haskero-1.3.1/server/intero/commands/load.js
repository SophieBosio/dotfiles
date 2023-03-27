'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoDiagnostic_1 = require("./interoDiagnostic");
const interoUtils_1 = require("../interoUtils");
const uriUtils_1 = require("../../utils/uriUtils");
const regexpUtils_1 = require("../../utils/regexpUtils");
/**
 * Load response, returns diagnostics (errors and warnings)
 */
class LoadResponse {
    constructor(rawout, rawerr, parseDiagnostics) {
        //curried definition for partial application
        this.matchTo = (kind) => (match) => {
            return new interoDiagnostic_1.InteroDiagnostic(match[1], +match[2], +match[3], match[4], kind);
        };
        this._rawout = rawout;
        this._rawerr = rawerr;
        if (parseDiagnostics) {
            //find errors first
            const regErrors = /([^\r\n]+):(\d+):(\d+):(?: error:)?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
            let matchErrors = this.removeDuplicates(regexpUtils_1.allMatchs(rawerr, regErrors));
            this.errors = matchErrors.map(this.matchTo(interoDiagnostic_1.InteroDiagnosticKind.error));
            const regWarnings = /([^\r\n]+):(\d+):(\d+): Warning:(?: \[.*\])?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
            let matchWarnings = this.removeDuplicates(regexpUtils_1.allMatchs(rawerr, regWarnings));
            this.warnings = matchWarnings.map(this.matchTo(interoDiagnostic_1.InteroDiagnosticKind.warning));
            this._diagnostics = this.errors.concat(this.warnings);
        }
        else {
            this._diagnostics = [];
        }
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
    get diagnostics() {
        return this._diagnostics;
    }
    removeDuplicates(matches) {
        let matchToKey = (m) => m[0].trim();
        //List all matches and accumulate them in one object (hash key : match)
        let matchesSetObject = matches.reduce((accu, m) => { accu[matchToKey(m)] = m; return accu; }, {});
        //Get all values
        return Object.keys(matchesSetObject).map(key => matchesSetObject[key]);
    }
}
exports.LoadResponse = LoadResponse;
/**
 * Reload request
 */
class LoadRequest {
    constructor(uris, parseDiagnostics) {
        this.uris = uris;
        this.parseDiagnostics = parseDiagnostics;
    }
    send(interoProxy) {
        const filePaths = this.uris.map(uriUtils_1.UriUtils.toFilePath);
        const escapedFilePaths = filePaths.map(interoUtils_1.InteroUtils.escapeFilePath);
        const load = `:l ${escapedFilePaths.join(' ')}`;
        return interoProxy.sendRawRequest(load)
            .then((response) => {
            return Promise.resolve(new LoadResponse(response.rawout, response.rawerr, this.parseDiagnostics));
        });
    }
}
exports.LoadRequest = LoadRequest;
//# sourceMappingURL=load.js.map