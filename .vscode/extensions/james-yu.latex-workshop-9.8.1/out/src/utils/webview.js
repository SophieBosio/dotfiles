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
exports.moveActiveEditor = exports.moveWebviewPanel = exports.replaceWebviewPlaceholders = void 0;
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("../lw"));
function replaceWebviewPlaceholders(content, webview) {
    const extensionRootUri = vscode.Uri.file(lw.extensionRoot);
    const resourcesFolderUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionRootUri, 'resources'));
    const resourcesFolderLink = resourcesFolderUri.toString();
    const pdfjsDistUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionRootUri, 'node_modules', 'pdfjs-dist'));
    const pdfjsDistLink = pdfjsDistUri.toString();
    return content.replace(/%VSCODE_RES%/g, resourcesFolderLink)
        .replace(/%VSCODE_PDFJS_DIST%/g, pdfjsDistLink)
        .replace(/%VSCODE_CSP%/g, webview.cspSource);
}
exports.replaceWebviewPlaceholders = replaceWebviewPlaceholders;
function getMoveCommands(tabEditorGroup) {
    if (tabEditorGroup === 'left') {
        return {
            moveAction: 'workbench.action.moveEditorToLeftGroup',
            focusAction: 'workbench.action.focusRightGroup'
        };
    }
    if (tabEditorGroup === 'right') {
        return {
            moveAction: 'workbench.action.moveEditorToRightGroup',
            focusAction: 'workbench.action.focusLeftGroup'
        };
    }
    if (tabEditorGroup === 'above') {
        return {
            moveAction: 'workbench.action.moveEditorToAboveGroup',
            focusAction: 'workbench.action.focusBelowGroup'
        };
    }
    if (tabEditorGroup === 'below') {
        return {
            moveAction: 'workbench.action.moveEditorToBelowGroup',
            focusAction: 'workbench.action.focusAboveGroup'
        };
    }
    return;
}
async function moveWebviewPanel(panel, tabEditorGroup) {
    panel.reveal(undefined, false);
    await moveActiveEditor(tabEditorGroup, true);
}
exports.moveWebviewPanel = moveWebviewPanel;
async function moveActiveEditor(tabEditorGroup, preserveFocus) {
    const actions = getMoveCommands(tabEditorGroup);
    if (!actions) {
        return;
    }
    await vscode.commands.executeCommand(actions.moveAction);
    if (preserveFocus) {
        await vscode.commands.executeCommand(actions.focusAction);
    }
}
exports.moveActiveEditor = moveActiveEditor;
//# sourceMappingURL=webview.js.map