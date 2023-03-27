"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const checkBoxList_1 = require("../utils/checkBoxList");
const checkBox_1 = require("../utils/checkBox");
/**
 * Command which opens a quickpick selection menu to select the active Cabal target
 * in the Haskero service
 */
class SelectTarget {
    constructor(haskeroClient) {
        this.haskeroClient = haskeroClient;
        this.id = SelectTarget.id;
        this.handler = () => {
            this.haskeroClient.getTargets().then((haskeroTargets) => {
                const boxList = new checkBoxList_1.default(haskeroTargets.targetList.map(t => new checkBox_1.default(t.name, t.isSelected, t.isUnique)));
                boxList.show().then((checkBoxes) => {
                    if (checkBoxes === null) {
                        return;
                    }
                    checkBoxes.forEach(cb => {
                        haskeroTargets.setSelectedTarget(cb.value, cb.isSelected);
                    });
                    let newTargets = haskeroTargets.toInteroTargets();
                    //sendNotification need an array of parameters and here, the target array is ONE parameter
                    return this.haskeroClient.client
                        .sendRequest('changeTargets', [newTargets])
                        .then(resp => {
                        this.haskeroClient.client.info("Change target done.", resp);
                        vscode.window.showInformationMessage("Change target done. " + resp);
                        SelectTarget.onTargetsSelected.fire(haskeroTargets);
                    }, reason => {
                        this.haskeroClient.client.error(`Change targets failed. Stopping Haskero for this target. Switch to another target or 'Default targets'.
Hint : try running a build command to get missing dependencies (> stack build ${newTargets.join(' ')})
Error details:
`, reason);
                        vscode.window.showErrorMessage("Change targets failed. Stopping Haskero for this target. Switch to another target or 'Default targets'.");
                    });
                }, (reason) => {
                    console.log("cata : ");
                    console.dir(reason);
                });
            });
        };
    }
}
SelectTarget.onTargetsSelected = new vscode.EventEmitter();
SelectTarget.id = 'haskero.selectTarget';
exports.SelectTarget = SelectTarget;
//# sourceMappingURL=selectTargets.js.map