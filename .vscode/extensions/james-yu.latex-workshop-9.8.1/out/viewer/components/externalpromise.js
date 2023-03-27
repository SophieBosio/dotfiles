var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ExternalPromise_isResolved;
function promisePair() {
    let resolve = () => { };
    const promise = new Promise((r) => {
        resolve = r;
    });
    return { promise, resolve };
}
export class ExternalPromise {
    constructor() {
        this.promisePair = promisePair();
        _ExternalPromise_isResolved.set(this, false);
    }
    resolve(value) {
        __classPrivateFieldSet(this, _ExternalPromise_isResolved, true, "f");
        this.promisePair.resolve(value);
    }
    get promise() {
        return this.promisePair.promise;
    }
    get isResolved() {
        return __classPrivateFieldGet(this, _ExternalPromise_isResolved, "f");
    }
}
_ExternalPromise_isResolved = new WeakMap();
//# sourceMappingURL=externalpromise.js.map