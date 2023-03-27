'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const regexpUtils_1 = require("../../utils/regexpUtils");
/**
 * show modules intero response
 */
class ShowModulesResponse {
    constructor(rawout, rawerr) {
        this.rawout = rawout;
        this.rawerr = rawerr;
        this.isOk = true;
        let pattern = /.*\((.*),.*\)/gi;
        let matches = regexpUtils_1.allMatchs(rawout, pattern);
        this.modules = matches.map(match => match[1].trim());
    }
}
exports.ShowModulesResponse = ShowModulesResponse;
/**
 * show modules intero request
 */
class ShowModulesRequest {
    constructor() {
    }
    send(interoProxy) {
        const req = ':show modules';
        return interoProxy.sendRawRequest(req)
            .then((response) => {
            return Promise.resolve(new ShowModulesResponse(response.rawout, response.rawerr));
        });
    }
}
exports.ShowModulesRequest = ShowModulesRequest;
//# sourceMappingURL=showModules.js.map