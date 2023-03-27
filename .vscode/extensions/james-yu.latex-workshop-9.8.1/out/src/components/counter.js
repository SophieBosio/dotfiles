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
exports.Counter = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cs = __importStar(require("cross-spawn"));
const lw = __importStar(require("../lw"));
const logger_1 = require("./logger");
const logger = (0, logger_1.getLogger)('Counter');
class Counter {
    constructor() {
        this.useDocker = false;
        this.disableCountAfterSave = false;
        this.autoRunEnabled = false;
        this.autoRunInterval = 0;
        this.commandArgs = [];
        this.commandPath = '';
        this.texCountMessage = '';
        this.wordCount = '';
        // gotoLine status item has priority 100.5 and selectIndentation item has priority 100.4
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100.45);
        this.loadConfiguration(this.getWorkspace());
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('latex-workshop.texcount', this.getWorkspace()) || e.affectsConfiguration('latex-workshop.docker.enabled')) {
                this.loadConfiguration(this.getWorkspace());
                this.updateStatusVisibility();
            }
        });
        this.updateStatusVisibility();
        vscode.window.onDidChangeActiveTextEditor((e) => {
            if (e && lw.manager.hasTexId(e.document.languageId)) {
                this.loadConfiguration(e.document.uri);
                this.updateStatusVisibility();
            }
            else {
                this.status.hide();
            }
        });
    }
    getWorkspace() {
        if (vscode.window.activeTextEditor) {
            return vscode.window.activeTextEditor.document.uri;
        }
        return lw.manager.getWorkspaceFolderRootDir();
    }
    loadConfiguration(scope) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', scope);
        this.autoRunEnabled = (configuration.get('texcount.autorun') === 'onSave');
        this.autoRunInterval = configuration.get('texcount.interval');
        this.commandArgs = configuration.get('texcount.args');
        this.commandPath = configuration.get('texcount.path');
        this.useDocker = configuration.get('docker.enabled');
    }
    updateStatusVisibility() {
        if (this.autoRunEnabled) {
            this.updateWordCount();
            this.status.show();
        }
        else {
            this.status.hide();
        }
    }
    updateWordCount() {
        if (this.wordCount === '') {
            this.status.text = '';
            this.status.tooltip = '';
        }
        else {
            this.status.text = this.wordCount + ' words';
            this.status.tooltip = this.texCountMessage;
        }
    }
    countOnSaveIfEnabled(file) {
        if (!this.autoRunEnabled) {
            return;
        }
        if (this.disableCountAfterSave) {
            logger.log('Auto texcount is temporarily disabled during a second.');
            return;
        }
        logger.log(`Auto texcount started on saving file ${file} .`);
        this.disableCountAfterSave = true;
        setTimeout(() => this.disableCountAfterSave = false, this.autoRunInterval);
        void this.runTeXCount(file).then(() => {
            this.updateWordCount();
        });
    }
    count(file, merge = true) {
        void this.runTeXCount(file, merge).then(() => {
            void vscode.window.showInformationMessage(this.texCountMessage);
        });
    }
    runTeXCount(file, merge = true) {
        let command = this.commandPath;
        if (this.useDocker) {
            logger.log('Use Docker to invoke the command.');
            if (process.platform === 'win32') {
                command = path.resolve(lw.extensionRoot, './scripts/texcount.bat');
            }
            else {
                command = path.resolve(lw.extensionRoot, './scripts/texcount');
                fs.chmodSync(command, 0o755);
            }
        }
        const args = Array.from(this.commandArgs);
        if (merge && !args.includes('-merge')) {
            args.push('-merge');
        }
        args.push(path.basename(file));
        logger.logCommand('Count words using command.', command, args);
        const proc = cs.spawn(command, args, { cwd: path.dirname(file) });
        proc.stdout.setEncoding('utf8');
        proc.stderr.setEncoding('utf8');
        let stdout = '';
        proc.stdout.on('data', newStdout => {
            stdout += newStdout;
        });
        let stderr = '';
        proc.stderr.on('data', newStderr => {
            stderr += newStderr;
        });
        proc.on('error', err => {
            logger.logError('Cannot count words.', err, stderr);
            void logger.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.');
        });
        return new Promise(resolve => {
            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    logger.logError('Cannot count words', exitCode, stderr);
                    void logger.showErrorMessage('TeXCount failed. Please refer to LaTeX Workshop Output for details.');
                }
                else {
                    const words = /Words in text: ([0-9]*)/g.exec(stdout);
                    const floats = /Number of floats\/tables\/figures: ([0-9]*)/g.exec(stdout);
                    if (words) {
                        let floatMsg = '';
                        if (floats && parseInt(floats[1]) > 0) {
                            floatMsg = `and ${floats[1]} float${parseInt(floats[1]) > 1 ? 's' : ''} (tables, figures, etc.) `;
                        }
                        this.wordCount = words[1];
                        this.texCountMessage = `There are ${words[1]} words ${floatMsg}in the ${merge ? 'LaTeX project' : 'opened LaTeX file'}.`;
                        resolve(true);
                    }
                }
            });
        });
    }
}
exports.Counter = Counter;
//# sourceMappingURL=counter.js.map