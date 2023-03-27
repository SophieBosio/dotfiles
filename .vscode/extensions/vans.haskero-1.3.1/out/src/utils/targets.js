"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allTargets = 'All targets';
exports.noTargets = 'Default';
/**
 * An Haskero target.
 * It is like a cabal target + virtual targets.
 * A virtual target is a target unknown by cabal but that haskero car map to cabal targets (ie: 'default target' is mapped to the empty string target)
 */
class Target {
    /**
     * Constructor
     * @param name Target cabal name
     * @param isSelected true if the target is activated (selected)
     * @param isVirtual a virtual target is not a cabal cabal target by itself. It can be mapped to cabal target. For instance:
     * 'all target' or 'default target'
     * @param isUnique a unique target is activated (selected) alone
     */
    constructor(name, isSelected = false, isVirtual = false, isUnique = false) {
        this.name = name;
        this.isSelected = isSelected;
        this.isVirtual = isVirtual;
        this.isUnique = isUnique;
    }
    /**
     * User friendly target text
     */
    toText() {
        switch (this.name) {
            case exports.allTargets:
                return exports.allTargets;
            case exports.noTargets:
                return "Default targets";
            default:
                return this.name.split(':').splice(1).join(':');
        }
    }
}
exports.Target = Target;
/**
 * Haskero targets.
 * Handles the current cabal targets which are selected by the user
 */
class HaskeroTargets {
    /**
     * Creates a HaskeroTargets
     * @param stackTargets cabal targets
     */
    constructor(stackTargets) {
        this.stackTargets = stackTargets;
        this._targets = new Map();
        //adds 2 virtual targets
        this._targets.set(exports.allTargets, new Target(exports.allTargets, false, true, true));
        this._targets.set(exports.noTargets, new Target(exports.noTargets, true, true, true));
        stackTargets.forEach(t => {
            this._targets.set(t, new Target(t));
        });
    }
    get targetList() {
        return [...this._targets.values()];
    }
    setSelectedTarget(targetName, isSelected) {
        this._targets.get(targetName).isSelected = isSelected;
    }
    /**
     * Map targets to targets known by cabal
     */
    toInteroTargets() {
        if (this._targets.get(exports.allTargets).isSelected)
            return this.stackTargets;
        if (this._targets.get(exports.noTargets).isSelected)
            return [];
        return [...this._targets.values()].filter(e => e.isSelected).map(t => t.name);
    }
    /**
     * User friendly targets text
     */
    toText() {
        return "Targets: " + this.getSelectedTargets().map(t => t.name).join(" ");
    }
    getSelectedTargets() {
        return this.targetList.filter(t => t.isSelected);
    }
}
exports.HaskeroTargets = HaskeroTargets;
//# sourceMappingURL=targets.js.map