"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CheckBox {
    constructor(_value, _isSelected, isUnique) {
        this._value = _value;
        this._isSelected = _isSelected;
        this.isUnique = isUnique;
        this.checkboxOn = '☒';
        this.checkboxOff = '☐';
    }
    get isSelected() {
        return this._isSelected;
    }
    get value() {
        return this._value;
    }
    name() {
        return (this.isSelected ? this.checkboxOn : this.checkboxOff) + ' ' + this.value;
    }
    switch() {
        this._isSelected = !this._isSelected;
    }
    unCheck() {
        this._isSelected = false;
    }
    static nameToValue(name) {
        //remove the 2 begining char (box and space)
        return name.slice(2);
    }
}
exports.default = CheckBox;
//# sourceMappingURL=checkBox.js.map