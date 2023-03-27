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
exports.resolveBibPath = exports.getFlsFilePath = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const cs = __importStar(require("cross-spawn"));
const fs = __importStar(require("fs"));
const lw = __importStar(require("../../lw"));
const utils = __importStar(require("../../utils/utils"));
const logger_1 = require("../logger");
const logger = (0, logger_1.getLogger)('Cacher', 'Path');
/**
 * Search for a `.fls` file associated to a tex file
 * @param texFile The path of LaTeX file
 * @return The path of the .fls file or undefined
 */
function getFlsFilePath(texFile) {
    const rootDir = path.dirname(texFile);
    const outDir = lw.manager.getOutDir(texFile);
    const baseName = path.parse(lw.manager.jobname(texFile)).name;
    const flsFile = path.resolve(rootDir, path.join(outDir, baseName + '.fls'));
    if (!fs.existsSync(flsFile)) {
        logger.log(`Non-existent .fls for ${texFile} .`);
        return;
    }
    return flsFile;
}
exports.getFlsFilePath = getFlsFilePath;
function kpsewhichBibPath(bib) {
    const kpsewhich = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path');
    logger.log(`Calling ${kpsewhich} to resolve ${bib} .`);
    try {
        const kpsewhichReturn = cs.sync(kpsewhich, ['-format=.bib', bib]);
        if (kpsewhichReturn.status === 0) {
            const bibPath = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '');
            if (bibPath === '') {
                return;
            }
            else {
                return bibPath;
            }
        }
    }
    catch (e) {
        logger.logError(`Calling ${kpsewhich} on ${bib} failed.`, e);
    }
    return;
}
function resolveBibPath(bib, baseDir) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    const bibDirs = configuration.get('latex.bibDirs');
    // chapterbib requires to load the .bib file in every chapter using
    // the path relative to the rootDir
    const searchDirs = [...(lw.manager.rootDir ?? []), baseDir, ...bibDirs];
    const bibPath = utils.resolveFile(searchDirs, bib, '.bib');
    if (!bibPath) {
        if (configuration.get('kpsewhich.enabled')) {
            return kpsewhichBibPath(bib);
        }
        else {
            logger.log(`Cannot resolve ${bib} .`);
            return;
        }
    }
    return bibPath;
}
exports.resolveBibPath = resolveBibPath;
//# sourceMappingURL=pathutils.js.map