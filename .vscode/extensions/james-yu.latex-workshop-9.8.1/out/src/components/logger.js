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
exports.getLogger = exports.getCachedLog = exports.resetCachedLog = void 0;
const vscode = __importStar(require("vscode"));
const LOG_PANEL = vscode.window.createOutputChannel('LaTeX Workshop');
const COMPILER_PANEL = vscode.window.createOutputChannel('LaTeX Compiler');
const STATUS_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000);
const PLACEHOLDERS = {};
COMPILER_PANEL.append('Ready');
let CACHED_EXTLOG = [];
let CACHED_COMPILER = [];
function resetCachedLog() {
    CACHED_EXTLOG = [];
    CACHED_COMPILER = [];
}
exports.resetCachedLog = resetCachedLog;
function getCachedLog() {
    return { CACHED_EXTLOG, CACHED_COMPILER };
}
exports.getCachedLog = getCachedLog;
function getLogger(...tags) {
    const tagString = tags.map(tag => `[${tag}]`).join('');
    return {
        log(message) {
            logTagless(`${tagString} ${message}`);
        },
        logCommand(message, command, args = []) {
            logCommandTagless(`${tagString} ${message}`, command, args);
        },
        logError(message, error, stderr) {
            logErrorTagless(`${tagString} ${message}`, error, stderr);
        },
        logCompiler,
        initializeStatusBarItem,
        clearCompilerMessage,
        showLog,
        showCompilerLog,
        showStatus,
        refreshStatus,
        showErrorMessage,
        showErrorMessageWithCompilerLogButton,
        showErrorMessageWithExtensionLogButton
    };
}
exports.getLogger = getLogger;
function logTagless(message) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    if (!configuration.get('message.log.show')) {
        return;
    }
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    vscode.workspace.workspaceFolders?.forEach(folder => {
        if (folder.uri.fsPath in PLACEHOLDERS) {
            return;
        }
        const placeholder = `%WS${Object.keys(PLACEHOLDERS).length + 1}%`;
        PLACEHOLDERS[folder.uri.fsPath] = placeholder;
        const log = `[${timestamp}][Logger] New log placeholder ${placeholder} registered for ${folder.uri.fsPath} .`;
        LOG_PANEL.appendLine(log);
        CACHED_EXTLOG.push(log);
    });
    const log = `[${timestamp}]${applyPlaceholders(message)}`;
    LOG_PANEL.appendLine(log);
    CACHED_EXTLOG.push(log);
}
function applyPlaceholders(message) {
    Object.entries(PLACEHOLDERS).forEach(([path, placeholder]) => message = message.replaceAll(path, placeholder));
    return message;
}
function logCommandTagless(message, command, args = []) {
    logTagless(`${message} The command is ${command}:${JSON.stringify(args)}.`);
}
function logErrorTagless(message, error, stderr) {
    if (error instanceof Error) {
        logTagless(`${message} ${error.name}: ${error.message}`);
        if (error.stack) {
            logTagless(error.stack);
        }
    }
    else if (error instanceof Number) {
        logTagless(`${message} Exit code ${error}`);
    }
    else {
        logTagless(`${message} Context: ${String(error)}.`);
    }
    if (stderr) {
        logTagless(`[STDERR] ${stderr}`);
    }
}
function logCompiler(message) {
    COMPILER_PANEL.append(message);
    CACHED_COMPILER.push(message);
}
function initializeStatusBarItem() {
    STATUS_ITEM.command = 'latex-workshop.actions';
    STATUS_ITEM.show();
    refreshStatus('check', 'statusBar.foreground');
}
function clearCompilerMessage() {
    COMPILER_PANEL.clear();
}
function showLog() {
    LOG_PANEL.show();
}
function showCompilerLog() {
    COMPILER_PANEL.show();
}
function showStatus() {
    STATUS_ITEM.show();
}
function refreshStatus(icon, color, message = undefined, severity = 'info', build = '') {
    STATUS_ITEM.text = `$(${icon})${build}`;
    STATUS_ITEM.tooltip = message;
    STATUS_ITEM.color = new vscode.ThemeColor(color);
    if (message === undefined) {
        return;
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    switch (severity) {
        case 'info':
            if (configuration.get('message.information.show')) {
                void vscode.window.showInformationMessage(message);
            }
            break;
        case 'warning':
            if (configuration.get('message.warning.show')) {
                void vscode.window.showWarningMessage(message);
            }
            break;
        case 'error':
        default:
            if (configuration.get('message.error.show')) {
                void vscode.window.showErrorMessage(message);
            }
            break;
    }
}
function showErrorMessage(message, ...args) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    if (configuration.get('message.error.show')) {
        return vscode.window.showErrorMessage(message, ...args);
    }
    return;
}
function showErrorMessageWithCompilerLogButton(message) {
    const res = showErrorMessage(message, 'Open compiler log');
    if (res) {
        return res.then(option => {
            switch (option) {
                case 'Open compiler log': {
                    showCompilerLog();
                    break;
                }
                default: {
                    break;
                }
            }
        });
    }
    return;
}
function showErrorMessageWithExtensionLogButton(message) {
    const res = showErrorMessage(message, 'Open LaTeX Workshop log');
    if (res) {
        return res.then(option => {
            switch (option) {
                case 'Open LaTeX Workshop log': {
                    showLog();
                    break;
                }
                default: {
                    break;
                }
            }
        });
    }
    return;
}
//# sourceMappingURL=logger.js.map