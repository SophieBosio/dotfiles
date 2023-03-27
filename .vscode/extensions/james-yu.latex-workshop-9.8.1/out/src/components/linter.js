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
exports.Linter = void 0;
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("../lw"));
const chktex_1 = require("./linterlib/chktex");
const lacheck_1 = require("./linterlib/lacheck");
const logger_1 = require("./logger");
const logger = (0, logger_1.getLogger)('Linter');
class Linter {
    getLinters(scope) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', scope);
        const linters = [];
        if (configuration.get('linting.chktex.enabled')) {
            linters.push(chktex_1.chkTeX);
        }
        else {
            chktex_1.chkTeX.linterDiagnostics.clear();
        }
        if (configuration.get('linting.lacheck.enabled')) {
            linters.push(lacheck_1.laCheck);
        }
        else {
            lacheck_1.laCheck.linterDiagnostics.clear();
        }
        return linters;
    }
    lintRootFileIfEnabled() {
        const linters = this.getLinters(lw.manager.getWorkspaceFolderRootDir());
        linters.forEach(linter => {
            if (lw.manager.rootFile === undefined) {
                logger.log(`No root file found for ${linter.getName()}.`);
                return;
            }
            logger.log(`${linter.getName()} lints root ${lw.manager.rootFile} .`);
            void linter.lintRootFile(lw.manager.rootFile);
        });
    }
    lintActiveFileIfEnabledAfterInterval(document) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri);
        const linters = this.getLinters(document.uri);
        if (linters.length > 0
            && configuration.get('linting.run') === 'onType') {
            const interval = configuration.get('linting.delay');
            if (this.linterTimeout) {
                clearTimeout(this.linterTimeout);
            }
            this.linterTimeout = setTimeout(() => linters.forEach(linter => {
                logger.log(`${linter.getName()} lints ${document.fileName} .`);
                void linter.lintFile(document);
            }), interval);
        }
    }
}
exports.Linter = Linter;
//# sourceMappingURL=linter.js.map