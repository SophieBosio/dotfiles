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
exports.LwFileSystem = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
class LwFileSystem {
    isLocalUri(uri) {
        return uri.scheme === 'file';
    }
    isVirtualUri(uri) {
        return !this.isLocalUri(uri);
    }
    async exists(uri) {
        try {
            if (this.isLocalUri(uri)) {
                return fs.existsSync(uri.fsPath);
            }
            else {
                await vscode.workspace.fs.stat(uri);
                return true;
            }
        }
        catch {
            return false;
        }
    }
    async readFile(fileUri) {
        const result = await this.readFileAsBuffer(fileUri);
        return result.toString();
    }
    async readFileAsBuffer(fileUri) {
        if (this.isLocalUri(fileUri)) {
            return fs.promises.readFile(fileUri.fsPath);
        }
        else {
            const resultUint8 = await vscode.workspace.fs.readFile(fileUri);
            return Buffer.from(resultUint8);
        }
    }
    readFileSyncGracefully(filepath) {
        try {
            const ret = fs.readFileSync(filepath).toString();
            return ret;
        }
        catch (err) {
            return;
        }
    }
    async stat(fileUri) {
        if (this.isLocalUri(fileUri)) {
            return fs.statSync(fileUri.fsPath);
        }
        else {
            return vscode.workspace.fs.stat(fileUri);
        }
    }
}
exports.LwFileSystem = LwFileSystem;
//# sourceMappingURL=lwfs.js.map