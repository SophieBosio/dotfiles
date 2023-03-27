"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function zipWith(xs, ys, combine) {
    let result = new Array();
    for (var i = 0; i < xs.length && i < ys.length; i++) {
        var x = xs[i];
        var y = ys[i];
        result.push(combine(x, y));
    }
    return result;
}
exports.zipWith = zipWith;
//# sourceMappingURL=functionalUtils.js.map