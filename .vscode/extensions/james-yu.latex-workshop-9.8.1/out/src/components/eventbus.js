"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = exports.AutoCleaned = exports.StructureUpdated = exports.DocumentChanged = exports.FileRemoved = exports.FileChanged = exports.FileWatched = exports.ViewerStatusChanged = exports.ViewerPageLoaded = exports.FileParsed = exports.RootFileSearched = exports.RootFileChanged = exports.AutoBuildInitiated = exports.BuildDone = void 0;
const events_1 = require("events");
exports.BuildDone = 'BUILD_DONE';
exports.AutoBuildInitiated = 'AUTO_BUILD_INITIATED';
exports.RootFileChanged = 'ROOT_FILE_CHANGED';
exports.RootFileSearched = 'ROOT_FILE_SEARCHED';
exports.FileParsed = 'FILE_PARSED';
exports.ViewerPageLoaded = 'VIEWER_PAGE_LOADED';
exports.ViewerStatusChanged = 'VIEWER_STATUS_CHANGED';
exports.FileWatched = 'FILE_WATCHED';
exports.FileChanged = 'FILE_CHANGED';
exports.FileRemoved = 'FILE_REMOVED';
exports.DocumentChanged = 'DOCUMENT_CHANGED';
exports.StructureUpdated = 'STRUCTURE_UPDATED';
exports.AutoCleaned = 'AUTO_CLEANED';
class EventBus {
    constructor() {
        this.eventEmitter = new events_1.EventEmitter();
    }
    dispose() {
        this.eventEmitter.removeAllListeners();
    }
    fire(eventName, arg) {
        this.eventEmitter.emit(eventName, arg);
    }
    // onDidChangeRootFile(cb: (rootFile: EventArgTypeMap[typeof RootFileChanged]) => void): Disposable {
    //     return this.registerListener(RootFileChanged, cb)
    // }
    // onDidEndFindRootFile(cb: () => void): Disposable {
    //     return this.registerListener(RootFileSearched, cb)
    // }
    // onDidFileParsed(cb: () => void): Disposable {
    //     return this.registerListener(FileParsed, cb)
    // }
    // onDidChangePdfViewerStatus(cb: (status: EventArgTypeMap[typeof ViewerStatusChanged]) => void): Disposable {
    //     return this.registerListener(ViewerStatusChanged, cb)
    // }
    // private registerListener<T extends keyof EventArgTypeMap>(
    //     eventName: T,
    //     cb: (arg: EventArgTypeMap[T]) => void
    // ): Disposable
    // private registerListener<T extends EventName>(
    //     eventName: T,
    //     cb: () => void
    // ): Disposable
    // private registerListener<T extends EventName>(
    //     eventName: T,
    //     cb: (arg?: any) => void
    // ): Disposable
    //  {
    //     this.eventEmitter.on(eventName, cb)
    //     const disposable = {
    //         dispose: () => { this.eventEmitter.removeListener(eventName, cb) }
    //     }
    //     return disposable
    // }
    on(eventName, cb) {
        this.eventEmitter.on(eventName, cb);
        const disposable = {
            dispose: () => { this.eventEmitter.removeListener(eventName, cb); }
        };
        return disposable;
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=eventbus.js.map