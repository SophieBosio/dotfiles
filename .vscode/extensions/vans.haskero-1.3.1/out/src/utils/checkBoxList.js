"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkBox_1 = require("./checkBox");
const vscode = require("vscode");
/**
 * Checkboxlist prompt
 */
class CheckBoxList {
    constructor(checkBoxes) {
        this.checkBoxes = checkBoxes;
    }
    /**
     * Show a checkboxlist to the user
     */
    show() {
        return this.innerShow(this.checkBoxes);
    }
    innerShow(checkBoxes) {
        let qpOptions = checkBoxes.map(c => c.name());
        qpOptions.push("Validate");
        return vscode.window.showQuickPick(qpOptions).then((selectedNames) => {
            if (!selectedNames) {
                return null;
            }
            //If user validate the choices
            if (selectedNames === "Validate") {
                //if the user don't select anything, show the checkboxes again
                if (checkBoxes.find(c => c.isSelected) === undefined) {
                    return this.innerShow(checkBoxes);
                }
                return checkBoxes;
            }
            else {
                const selectedChoice = checkBoxes.find(c => c.value === checkBox_1.default.nameToValue(selectedNames));
                //when a unique option is selected, it has to be the only one
                if (selectedChoice.isUnique) {
                    checkBoxes.forEach(cb => {
                        cb.unCheck();
                    });
                }
                else {
                    //when selecting a non-unique option, unselect all unique
                    checkBoxes.filter(cb => cb.isUnique).forEach(cb => {
                        cb.unCheck();
                    });
                }
                selectedChoice.switch();
                return this.innerShow(checkBoxes);
            }
        });
    }
}
exports.default = CheckBoxList;
//# sourceMappingURL=checkBoxList.js.map