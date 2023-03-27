'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
/**
 * Tools for URI manipulations
 */
class UriUtils {
    static normalizeFilePath(filePath) {
        return filePath.replace(/\\/g, '/');
    }
    /**
     * Converts an URI to a filePath
     */
    static toFilePath(uri) {
        let filePath = vscode_languageserver_1.Files.uriToFilePath(uri);
        //On win32, uriToFilePath returns a lowercase drive letter
        if (process.platform === 'win32') {
            filePath = filePath.charAt(0).toUpperCase() + filePath.substr(1);
        }
        return filePath;
    }
    /**
     * Converts a filePath to an URI
     */
    static toUri(filePath) {
        let prefix = '';
        //On win32, prefix has to be one '/' more longer
        if (process.platform === 'win32') {
            prefix = 'file:///';
        }
        else {
            prefix = 'file://';
        }
        return prefix + UriUtils.normalizeFilePath(filePath).split('/').map(encodeURIComponent).join('/');
    }
    /**
     * Tests if URI is a file path
     */
    static isFileProtocol(uri) {
        return UriUtils.toFilePath(uri) != null;
    }
}
exports.UriUtils = UriUtils;
//# sourceMappingURL=uriUtils.js.map