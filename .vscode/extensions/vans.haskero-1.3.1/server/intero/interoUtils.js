'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const interoProxy_1 = require("./interoProxy");
/**
 * Utilities functions used by all intero commands
 */
class InteroUtils {
    /**
     * Clean a raw response.
     */
    static normalizeRawResponse(raw) {
        let r = new RegExp(interoProxy_1.InteroProxy.EOTUtf8, 'g');
        return raw.replace(r, '').trim();
    }
    /**
     * Escape backslash and surround wiht double quotes
     * Usefull on windows to handle paths with spaces
     */
    static escapeFilePath(path) {
        return `"${path.replace(/\\/g, '\\\\')}"`;
    }
}
exports.InteroUtils = InteroUtils;
//# sourceMappingURL=interoUtils.js.map