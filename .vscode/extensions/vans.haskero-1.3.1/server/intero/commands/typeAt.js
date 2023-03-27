'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoUtils_1 = require("../interoUtils");
const uriUtils_1 = require("../../utils/uriUtils");
/**
 * type-at intero response
 */
class TypeAtResponse {
    constructor(rawout, rawerr, infoKind, id) {
        this.rawout = rawout;
        this.rawerr = rawerr;
        this.infoKind = infoKind;
        this.id = id;
        this.isOk = true;
        this.type = interoUtils_1.InteroUtils.normalizeRawResponse(rawout);
        if (this.type && this.type.length > 0) {
            //if the instanciated info kind is used, intero doesn't responds the identifier name, so we add it
            if (infoKind === TypeInfoKind.Instanciated) {
                this.type = id + ' ' + this.type;
            }
        }
    }
}
exports.TypeAtResponse = TypeAtResponse;
/**
 * type-at intero request
 */
class TypeAtRequest {
    constructor(uri, range, identifier, infoKind) {
        this.uri = uri;
        this.range = range;
        this.identifier = identifier;
        this.infoKind = infoKind;
    }
    send(interoProxy) {
        const filePath = uriUtils_1.UriUtils.toFilePath(this.uri);
        const escapedFilePath = interoUtils_1.InteroUtils.escapeFilePath(filePath);
        //if we add the identifier to the resquest, intero reponds the more genereic type signature possible
        //if we dont add the identifier to the request, interao responds the more specific type signature, as used in the specific text span
        const id = this.infoKind === TypeInfoKind.Generic ? ' ' + this.identifier : '';
        const req = `:type-at ${escapedFilePath} ${this.range.startLine} ${this.range.startCol} ${this.range.endLine} ${this.range.endCol}${id}`;
        return interoProxy.sendRawRequest(req)
            .then((response) => {
            return Promise.resolve(new TypeAtResponse(response.rawout, response.rawerr, this.infoKind, this.identifier));
        });
    }
}
exports.TypeAtRequest = TypeAtRequest;
/**
 * Kinf of type info, the generic or the instanciated on
 */
var TypeInfoKind;
(function (TypeInfoKind) {
    /**
     * Specialized type info, for a specific usage with closed/instanciated types (used in type hover for instance)
     */
    TypeInfoKind[TypeInfoKind["Instanciated"] = 0] = "Instanciated";
    /**
     * Generic type signature (used in type insert for instance)
     */
    TypeInfoKind[TypeInfoKind["Generic"] = 1] = "Generic";
})(TypeInfoKind = exports.TypeInfoKind || (exports.TypeInfoKind = {}));
//# sourceMappingURL=typeAt.js.map