"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateLabels = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const lw = __importStar(require("../lw"));
const logger_1 = require("./logger");
const logger = (0, logger_1.getLogger)('DupLabel');
class DuplicateLabels {
    constructor() {
        this.duplicatedLabelsDiagnostics = vscode.languages.createDiagnosticCollection('Duplicate Labels');
    }
    /**
     * Compute the dictionary of labels holding their file and position
     */
    computeDuplicates(file) {
        if (!lw.cacher.get(file)) {
            logger.log(`Cannot check for duplicate labels in a file not in manager: ${file} .`);
            return [];
        }
        const labelsCount = new Map();
        lw.cacher.getIncludedTeX().forEach(cachedFile => {
            const cachedRefs = lw.cacher.get(cachedFile)?.elements.reference;
            if (cachedRefs === undefined) {
                return;
            }
            cachedRefs.forEach(ref => {
                if (ref.range === undefined) {
                    return;
                }
                let count = labelsCount.get(ref.label);
                if (count === undefined) {
                    count = 0;
                }
                count += 1;
                labelsCount.set(ref.label, count);
            });
        });
        const duplicates = [];
        for (const [label, count] of labelsCount) {
            if (count > 1) {
                duplicates.push(label);
            }
        }
        return duplicates;
    }
    run(file) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (!configuration.get('check.duplicatedLabels.enabled')) {
            return;
        }
        logger.log(`Checking for duplicate labels: ${file} .`);
        const duplicates = this.computeDuplicates(file);
        this.showDiagnostics(duplicates);
    }
    showDiagnostics(duplicates) {
        this.duplicatedLabelsDiagnostics.clear();
        if (duplicates.length === 0) {
            return;
        }
        const diagsCollection = Object.create(null);
        lw.cacher.getIncludedTeX().forEach(cachedFile => {
            const cachedRefs = lw.cacher.get(cachedFile)?.elements.reference;
            if (cachedRefs === undefined) {
                return;
            }
            cachedRefs.forEach(ref => {
                if (ref.range === undefined) {
                    return;
                }
                if (duplicates.includes(ref.label)) {
                    if (!(cachedFile in diagsCollection)) {
                        diagsCollection[cachedFile] = [];
                    }
                    const range = ref.range instanceof vscode.Range ? ref.range : ref.range.inserting;
                    const diag = new vscode.Diagnostic(range, `Duplicate label ${ref.label}`, vscode.DiagnosticSeverity.Warning);
                    diag.source = 'DuplicateLabels';
                    diagsCollection[cachedFile].push(diag);
                }
            });
        });
        for (const file in diagsCollection) {
            if (path.extname(file) === '.tex') {
                this.duplicatedLabelsDiagnostics.set(vscode.Uri.file(file), diagsCollection[file]);
            }
        }
    }
    reset() {
        this.duplicatedLabelsDiagnostics.clear();
    }
}
exports.DuplicateLabels = DuplicateLabels;
//# sourceMappingURL=duplicatelabels.js.map