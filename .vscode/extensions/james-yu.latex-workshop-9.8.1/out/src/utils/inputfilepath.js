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
exports.InputFileRegExp = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
var MatchType;
(function (MatchType) {
    MatchType[MatchType["Input"] = 0] = "Input";
    MatchType[MatchType["Child"] = 1] = "Child";
})(MatchType || (MatchType = {}));
class InputFileRegExp {
    constructor() {
        this.inputReg = /\\(?:input|InputIfFileExists|include|SweaveInput|subfile|loadglsentries|(?:(?:sub)?(?:import|inputfrom|includefrom)\*?{([^}]*)}))(?:\[[^[\]{}]*\])?{([^}]*)}/g;
        this.childReg = /<<(?:[^,]*,)*\s*child='([^']*)'\s*(?:,[^,]*)*>>=/g;
    }
    /**
     * Return the matched input path. If there is no match, return undefined
     *
     * @param content the string to match the regex on
     * @param currentFile is the name of file in which the regex is executed
     * @param rootFile
     */
    execInput(content, currentFile, rootFile) {
        const result = this.inputReg.exec(content);
        if (result) {
            const match = {
                type: MatchType.Input,
                path: result[2],
                directory: result[1],
                matchedString: result[0],
                index: result.index
            };
            const filePath = InputFileRegExp.parseInputFilePath(match, currentFile, rootFile);
            return filePath ? { path: filePath, match } : undefined;
        }
        return;
    }
    /**
     * Return the matched child path. If there is no match, return undefined
     *
     * @param content the string to match the regex on
     * @param currentFile is the name of file in which the regex is executed
     * @param rootFile
     */
    execChild(content, currentFile, rootFile) {
        const result = this.childReg.exec(content);
        if (result) {
            const match = {
                type: MatchType.Child,
                path: result[1],
                directory: '',
                matchedString: result[0],
                index: result.index
            };
            const filePath = InputFileRegExp.parseInputFilePath(match, currentFile, rootFile);
            return filePath ? { path: filePath, match } : undefined;
        }
        return;
    }
    /**
     * Return the matched input or child path. If there is no match, return
     * undefined
     *
     * @param content the string to match the regex on
     * @param currentFile is the name of file in which the regex is executed
     * @param rootFile
     */
    exec(content, currentFile, rootFile) {
        return this.execInput(content, currentFile, rootFile)
            || this.execChild(content, currentFile, rootFile);
    }
    /**
     * Compute the resolved file path from matches of this.inputReg or this.childReg
     *
     * @param match is the the result of this.inputReg.exec() or this.childReg.exec()
     * @param currentFile is the name of file in which the match has been obtained
     * @param rootFile
     */
    static parseInputFilePath(match, currentFile, rootFile) {
        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs');
        /* match of this.childReg */
        if (match.type === MatchType.Child) {
            return (0, utils_1.resolveFile)([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], match.path);
        }
        /* match of this.inputReg */
        if (match.type === MatchType.Input) {
            if (match.matchedString.startsWith('\\subimport') || match.matchedString.startsWith('\\subinputfrom') || match.matchedString.startsWith('\\subincludefrom')) {
                return (0, utils_1.resolveFile)([path.dirname(currentFile)], path.join(match.directory, match.path));
            }
            else if (match.matchedString.startsWith('\\import') || match.matchedString.startsWith('\\inputfrom') || match.matchedString.startsWith('\\includefrom')) {
                return (0, utils_1.resolveFile)([match.directory, path.join(path.dirname(rootFile), match.directory)], match.path);
            }
            else {
                return (0, utils_1.resolveFile)([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], match.path);
            }
        }
        return;
    }
}
exports.InputFileRegExp = InputFileRegExp;
//# sourceMappingURL=inputfilepath.js.map