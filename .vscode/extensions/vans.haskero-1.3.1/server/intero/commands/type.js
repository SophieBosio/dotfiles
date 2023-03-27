'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoUtils_1 = require("../interoUtils");
/**
 * type intero response
 */
class TypeResponse {
    constructor(rawout, rawerr) {
        this.rawout = rawout;
        this.rawerr = rawerr;
        this.isOk = true;
        if (rawerr.indexOf("ot in scope") > -1) {
            this.identifierExists = false;
            this.type = null;
        }
        else {
            this.identifierExists = true;
            this.type = interoUtils_1.InteroUtils.normalizeRawResponse(rawout);
        }
    }
}
exports.TypeResponse = TypeResponse;
/**
 * type intero request
 */
class TypeRequest {
    constructor(identifier) {
        this.identifier = identifier;
    }
    send(interoProxy) {
        const req = `:type ${this.identifier}`;
        return interoProxy.sendRawRequest(req)
            .then((response) => {
            return Promise.resolve(new TypeResponse(response.rawout, response.rawerr));
        });
    }
}
exports.TypeRequest = TypeRequest;
//# sourceMappingURL=type.js.map