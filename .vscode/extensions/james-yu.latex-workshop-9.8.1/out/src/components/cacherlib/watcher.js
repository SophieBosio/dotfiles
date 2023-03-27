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
exports.Watcher = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lw = __importStar(require("../../lw"));
const eventbus = __importStar(require("../eventbus"));
const logger_1 = require("../logger");
const manager_1 = require("../manager");
const logger = (0, logger_1.getLogger)('Cacher', 'Watcher');
class Watcher {
    constructor(fileExt = '.*') {
        this.fileExt = fileExt;
        this.watchers = {};
        this.onCreateHandlers = new Set();
        this.onChangeHandlers = new Set();
        this.onDeleteHandlers = new Set();
        this.polling = {};
    }
    onCreate(handler) {
        this.onCreateHandlers.add(handler);
    }
    onChange(handler) {
        this.onChangeHandlers.add(handler);
    }
    onDelete(handler) {
        this.onDeleteHandlers.add(handler);
    }
    createWatcher(globPattern) {
        const watcher = vscode.workspace.createFileSystemWatcher(globPattern);
        watcher.onDidCreate((uri) => this.onDidChange('create', uri));
        watcher.onDidChange((uri) => this.onDidChange('change', uri));
        watcher.onDidDelete((uri) => {
            const fileName = path.basename(uri.fsPath);
            const folder = path.dirname(uri.fsPath);
            if (!this.watchers[folder]?.files.has(fileName)) {
                return;
            }
            logger.log(`"delete" emitted on ${uri.fsPath} .`);
            this.onDeleteHandlers.forEach(handler => handler(uri.fsPath));
            this.watchers[folder].files.delete(fileName);
            if (this.watchers[folder].files.size === 0) {
                this.watchers[folder].watcher.dispose();
                delete this.watchers[folder];
                logger.log(`Unwatched folder ${folder} .`);
            }
            lw.eventBus.fire(eventbus.FileRemoved, uri.fsPath);
        });
        return watcher;
    }
    onDidChange(event, uri) {
        if (!this.watchers[path.dirname(uri.fsPath)]?.files.has(path.basename(uri.fsPath))) {
            return;
        }
        if (!(0, manager_1.isBinary)(path.extname(uri.fsPath))) {
            logger.log(`"${event}" emitted on ${uri.fsPath} .`);
            this.onChangeHandlers.forEach(handler => handler(uri.fsPath));
            lw.eventBus.fire(eventbus.FileChanged, uri.fsPath);
            return;
        }
        // Another event has initiated a polling on the file, just ignore this
        if (this.polling[uri.fsPath] !== undefined) {
            return;
        }
        const firstChangeTime = Date.now();
        this.polling[uri.fsPath] = { size: fs.statSync(uri.fsPath).size, time: firstChangeTime };
        const polling = this.polling[uri.fsPath];
        const pollingInterval = setInterval(() => {
            // If does not exist, don't emit create/change
            if (!fs.existsSync(uri.fsPath)) {
                clearInterval(pollingInterval);
                delete this.polling[uri.fsPath];
                return;
            }
            // Save the size
            const size = fs.statSync(uri.fsPath).size;
            // Update the size and last change time
            if (size !== polling.size) {
                polling.size = size;
                polling.time = Date.now();
                return;
            }
            // Though size is not changed, the polling time is not met
            if (Date.now() - polling.time < 200) {
                return;
            }
            logger.log(`"${event}" emitted on ${uri.fsPath} after polling for ${Date.now() - firstChangeTime} ms.`);
            clearInterval(pollingInterval);
            delete this.polling[uri.fsPath];
            this.onChangeHandlers.forEach(handler => handler(uri.fsPath));
            lw.eventBus.fire(eventbus.FileChanged, uri.fsPath);
        }, vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.pdf.delay'));
    }
    add(filePath) {
        const fileName = path.basename(filePath);
        const folder = path.dirname(filePath);
        if (!this.watchers[folder]) {
            this.watchers[folder] = {
                watcher: this.createWatcher(new vscode.RelativePattern(folder, `*${this.fileExt}`)),
                files: new Set([fileName])
            };
            this.onCreateHandlers.forEach(handler => handler(filePath));
            logger.log(`Watched ${filePath} with a new watcher on ${folder} .`);
        }
        else {
            this.watchers[folder].files.add(fileName);
            this.onCreateHandlers.forEach(handler => handler(filePath));
            logger.log(`Watched ${filePath} .`);
        }
        lw.eventBus.fire(eventbus.FileWatched, filePath);
    }
    remove(filePath) {
        this.watchers[path.basename(filePath)]?.files.delete(path.basename(filePath));
    }
    has(filePath) {
        return this.watchers[path.dirname(filePath)]?.files.has(path.basename(filePath));
    }
    reset() {
        Object.entries(this.watchers).forEach(([folder, watcher]) => {
            watcher.watcher.dispose();
            delete this.watchers[folder];
        });
        logger.log('Reset.');
    }
}
exports.Watcher = Watcher;
//# sourceMappingURL=watcher.js.map