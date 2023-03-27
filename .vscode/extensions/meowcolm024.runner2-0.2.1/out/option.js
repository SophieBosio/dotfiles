"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterOption = exports.none = exports.some = exports.option = void 0;
class Some {
    constructor(value) {
        this.value = value;
        this.isEmpty = false;
    }
    unwrap() { return this.value; }
    map(f) {
        return new Some(f(this.value));
    }
    flatmap(f) {
        return f(this.value);
    }
    contains(e) {
        return this.value === e;
    }
    orelse(that) {
        return this.value;
    }
}
class None {
    constructor() {
        this.isEmpty = true;
    }
    unwrap() { throw new Error(); }
    map(f) {
        return new None;
    }
    flatmap(f) {
        return new None;
    }
    contains(e) {
        return false;
    }
    orelse(that) {
        return that;
    }
}
function option(u) {
    if (u === undefined) {
        return new None;
    }
    else {
        return new Some(u);
    }
}
exports.option = option;
function some(u) {
    return new Some(u);
}
exports.some = some;
function none() {
    return new None;
}
exports.none = none;
function filterOption(p, v) {
    return p(v) ? new Some(v) : new None;
}
exports.filterOption = filterOption;
//# sourceMappingURL=option.js.map