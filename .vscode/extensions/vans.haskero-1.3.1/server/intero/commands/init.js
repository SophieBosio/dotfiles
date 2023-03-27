'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoProxy_1 = require("../interoProxy");
const interoDiagnostic_1 = require("./interoDiagnostic");
const regexpUtils_1 = require("../../utils/regexpUtils");
/**
 * Response from interoInit request
 */
class InitResponse {
    constructor(rawout, rawerr) {
        //curried definition for partial application
        this.matchTo = (kind) => (match) => {
            return new interoDiagnostic_1.InteroDiagnostic(match[1], +match[2], +match[3], match[4], kind);
        };
        this._rawout = rawout;
        this._rawerr = rawerr;
        this._isOk = true;
        //find errors first
        const regErrors = /([^\r\n]+):(\d+):(\d+):(?: error:)?\r?\n([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
        let matchErrors = this.removeDuplicates(regexpUtils_1.allMatchs(rawerr, regErrors));
        let diagnostics = matchErrors.map(this.matchTo(interoDiagnostic_1.InteroDiagnosticKind.error));
        const regWarnings = /([^\r\n]+):(\d+):(\d+): Warning:(?: \[.*\])?\r?\n?([\s\S]+?)(?:\r?\n\r?\n|\r?\n[\S]+|$)/gi;
        let matchWarnings = this.removeDuplicates(regexpUtils_1.allMatchs(rawerr, regWarnings));
        diagnostics = diagnostics.concat(matchWarnings.map(this.matchTo(interoDiagnostic_1.InteroDiagnosticKind.warning)));
        this._diagnostics = diagnostics;
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
        //list all matches and accumulate them in one object (hash key : match)
        let matchesSetObject = matches.reduce((accu, m) => { accu[matchToKey(m)] = m; return accu; }, {});
        //Get all values
        return Object.keys(matchesSetObject).map(key => matchesSetObject[key]);
    }
}
exports.InitResponse = InitResponse;
/**
 * Initialises intero.
 * Changes the EOC char used by intero proxy to slice stdin in several responses
 */
class InitRequest {
    constructor() {
    }
    send(interoProxy) {
        const changePromptRequest = ':set prompt ' + interoProxy_1.InteroProxy.EOTInteroCmd;
        return interoProxy.sendRawRequest(changePromptRequest)
            .then((response) => {
            return Promise.resolve(new InitResponse(response.rawout, response.rawerr));
        });
    }
}
exports.InitRequest = InitRequest;
//# sourceMappingURL=init.js.map