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
exports.TeXDoc = void 0;
const vscode = __importStar(require("vscode"));
const cs = __importStar(require("cross-spawn"));
const lw = __importStar(require("../lw"));
const logger_1 = require("./logger");
const logger = (0, logger_1.getLogger)('TeXDoc');
class TeXDoc {
    runTexdoc(packageName) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const texdocPath = configuration.get('texdoc.path');
        const texdocArgs = Array.from(configuration.get('texdoc.args'));
        texdocArgs.push(packageName);
        logger.logCommand('Run texdoc command', texdocPath, texdocArgs);
        const proc = cs.spawn(texdocPath, texdocArgs);
        let stdout = '';
        proc.stdout.on('data', newStdout => {
            stdout += newStdout;
        });
        let stderr = '';
        proc.stderr.on('data', newStderr => {
            stderr += newStderr;
        });
        proc.on('error', err => {
            logger.log(`Cannot run texdoc: ${err.message}, ${stderr}`);
            void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.');
        });
        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                logger.logError(`Cannot find documentation for ${packageName}.`, exitCode);
                void logger.showErrorMessage('Texdoc failed. Please refer to LaTeX Workshop Output for details.');
            }
            else {
                const regex = new RegExp(`(no documentation found)|(Documentation for ${packageName} could not be found)`);
                if (stdout.match(regex) || stderr.match(regex)) {
                    logger.log(`Cannot find documentation for ${packageName}.`);
                    void logger.showErrorMessage(`Cannot find documentation for ${packageName}.`);
                }
                else {
                    logger.log(`Opening documentation for ${packageName}.`);
                }
            }
            logger.log(`texdoc stdout: ${stdout}`);
            logger.log(`texdoc stderr: ${stderr}`);
        });
    }
    texdoc(packageName) {
        if (packageName) {
            this.runTexdoc(packageName);
            return;
        }
        void vscode.window.showInputBox({ value: '', prompt: 'Package name' }).then(selectedPkg => {
            if (!selectedPkg) {
                return;
            }
            this.runTexdoc(selectedPkg);
        });
    }
    texdocUsepackages() {
        const names = new Set();
        for (const tex of lw.cacher.getIncludedTeX()) {
            const content = lw.cacher.get(tex);
            const pkgs = content && content.elements.package;
            if (!pkgs) {
                continue;
            }
            Object.keys(pkgs).forEach(packageName => names.add(packageName));
        }
        const packageNames = Array.from(new Set(names));
        const items = packageNames.map(packageName => ({ label: packageName }));
        void vscode.window.showQuickPick(items).then(selectedPkg => {
            if (!selectedPkg) {
                return;
            }
            this.runTexdoc(selectedPkg.label);
        });
    }
}
exports.TeXDoc = TeXDoc;
//# sourceMappingURL=texdoc.js.map