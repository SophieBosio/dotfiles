'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const load_1 = require("./load");
const interoUtils_1 = require("../interoUtils");
const uriUtils_1 = require("../../utils/uriUtils");
/**
 * 'complete' intero response
 */
class CompleteResponse {
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
        this._completions = interoUtils_1.InteroUtils
            .normalizeRawResponse(rawout)
            .split(/\r?\n/)
            .slice(1)
            .reduce(this.reducer, []);
    }
    //remove unwanted reponses
    //as we :load module before the :complete repl request, we can have artefacts from the previous :load answer in the stderr of :complete
    //it should be fixed with issue #15
    reducer(accu, line) {
        let res = line.match(/^"(.*)"$/);
        if (res !== null) {
            accu.push(res[1]);
            return accu;
        }
        return accu;
    }
}
exports.CompleteResponse = CompleteResponse;
/**
 * 'complete' intero request
 */
class CompleteRequest {
    constructor(uri, text) {
        this.uri = uri;
        this.text = text;
        this.text = text.replace(/[\r\n]/g, '');
    }
    send(interoProxy) {
        const filePath = uriUtils_1.UriUtils.toFilePath(this.uri);
        const escapedFilePath = interoUtils_1.InteroUtils.escapeFilePath(filePath);
        //send a load request first otherwise :complete is not executed on the right module (it's executed
        //on the current module)
        const loadRequest = new load_1.LoadRequest([this.uri], false);
        const req = `:complete repl "${this.text}"`;
        return loadRequest.send(interoProxy)
            .then((loadResponse) => {
            return interoProxy.sendRawRequest(req);
        })
            .then((response) => {
            return Promise.resolve(new CompleteResponse(response.rawout, response.rawerr));
        });
    }
}
exports.CompleteRequest = CompleteRequest;
//# sourceMappingURL=complete.js.map