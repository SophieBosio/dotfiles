'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoUtils_1 = require("../interoUtils");
const identifierKind_1 = require("../identifierKind");
/**
 * type-at intero response
 */
class InfoResponse {
    constructor(rawout, rawerr) {
        this.rawout = rawout;
        this.rawerr = rawerr;
        this.isOk = true;
        this.documentation = interoUtils_1.InteroUtils.normalizeRawResponse(rawout);
        this.detail = this.getFirstLine(this.documentation);
        if (this.documentation.startsWith("data ")) {
            this.kind = identifierKind_1.IdentifierKind.Data;
        }
        else if (this.documentation.startsWith("class ")) {
            this.kind = identifierKind_1.IdentifierKind.Class;
        }
        else if (this.documentation.startsWith("type ") || this.documentation.startsWith("newtype ")) {
            this.kind = identifierKind_1.IdentifierKind.Type;
        }
        else {
            this.kind = identifierKind_1.IdentifierKind.Function;
        }
    }
    getFirstLine(text) {
        return text.split('\n')[0];
    }
}
exports.InfoResponse = InfoResponse;
/**
 * type-at intero request
 */
class InfoRequest {
    constructor(identifier) {
        this.identifier = identifier;
    }
    send(interoProxy) {
        const req = `:info ${this.identifier}`;
        return interoProxy.sendRawRequest(req)
            .then((response) => {
            return Promise.resolve(new InfoResponse(response.rawout, response.rawerr));
        });
    }
}
exports.InfoRequest = InfoRequest;
//# sourceMappingURL=info.js.map