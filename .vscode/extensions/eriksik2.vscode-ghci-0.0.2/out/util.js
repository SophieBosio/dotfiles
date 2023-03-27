"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function format(fmt, keys) {
    let matches = [];
    for (const [find, replace] of Object.entries(keys)) {
        const regexp = RegExp(`{\s${find}\s}`);
        matches.push([]);
        let m = matches[matches.length - 1];
        let match;
        while ((match = regexp.exec(fmt)) !== null)
            m.push({ start: match.index, length: match[0].length });
    }
}
exports.format = format;
//# sourceMappingURL=util.js.map