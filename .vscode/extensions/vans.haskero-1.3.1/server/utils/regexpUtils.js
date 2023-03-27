"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Warning, this function uses exec, so the regexp object is mutated
 * @param text
 * @param regexp
 */
function allMatchs(text, regexp) {
    const matches = [];
    let match;
    while ((match = regexp.exec(text)) != null) {
        matches.push(match);
    }
    return matches;
}
exports.allMatchs = allMatchs;
/**
 * Warning, this function uses exec, so the regexp object is mutated
 * @param text
 * @param regexp
 */
function firstGroupOfFirstMatch(text, regexp) {
    let match = regexp.exec(text);
    if (match != null && match.length > 1) {
        return match[1];
    }
    return null;
}
exports.firstGroupOfFirstMatch = firstGroupOfFirstMatch;
//# sourceMappingURL=regexpUtils.js.map