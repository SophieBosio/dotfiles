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
exports.latexFormatterProvider = void 0;
const vscode = __importStar(require("vscode"));
const cs = __importStar(require("cross-spawn"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const lw = __importStar(require("../lw"));
const utils_1 = require("../utils/utils");
const logger_1 = require("../components/logger");
const logger = (0, logger_1.getLogger)('Format', 'TeX');
const fullRange = (doc) => doc.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
let currentOs;
let formatter = '';
let formatterArgs = [];
let formatting = false;
async function formatDocument(document, range) {
    if (formatting) {
        logger.log('Formatting in progress. Aborted.');
    }
    formatting = true;
    const configuration = vscode.workspace.getConfiguration('latex-workshop', document.uri);
    const pathMeta = configuration.get('latexindent.path');
    formatterArgs = configuration.get('latexindent.args');
    logger.log('Start formatting with latexindent.');
    try {
        if (formatter === '') {
            formatter = pathMeta;
            const latexindentPresent = await checkPath();
            if (!latexindentPresent) {
                formatter = '';
                logger.log(`Can not find ${formatter} in PATH: ${process.env.PATH}`);
                void logger.showErrorMessage('Can not find latexindent in PATH.');
                return [];
            }
        }
        const edit = await format(document, range);
        return edit;
    }
    finally {
        formatting = false;
    }
}
function checkPath() {
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    const useDocker = configuration.get('docker.enabled');
    if (useDocker) {
        logger.log('Use Docker to invoke the command.');
        if (process.platform === 'win32') {
            formatter = path.resolve(lw.extensionRoot, './scripts/latexindent.bat');
        }
        else {
            formatter = path.resolve(lw.extensionRoot, './scripts/latexindent');
            fs.chmodSync(formatter, 0o755);
        }
        return Promise.resolve(true);
    }
    if (path.isAbsolute(formatter)) {
        if (fs.existsSync(formatter)) {
            return Promise.resolve(true);
        }
        else {
            logger.log(`The path of latexindent is absolute and not found: ${formatter}`);
            return Promise.resolve(false);
        }
    }
    if (!currentOs) {
        logger.log('The current platform is undefined.');
        return Promise.resolve(false);
    }
    const checker = currentOs.checker;
    const fileExt = currentOs.fileExt;
    const checkFormatter = (resolve, isFirstTry = true) => {
        const check = cs.spawn(checker, [formatter]);
        let stdout = '';
        let stderr = '';
        check.stdout.setEncoding('utf8');
        check.stderr.setEncoding('utf8');
        check.stdout.on('data', d => { stdout += d; });
        check.stderr.on('data', d => { stderr += d; });
        check.on('close', code => {
            if (code && isFirstTry) {
                logger.log(`Error when checking latexindent: ${stderr}`);
                formatter += fileExt;
                logger.log(`Checking latexindent: ${checker} ${formatter}`);
                checkFormatter(resolve, false);
            }
            else if (code) {
                logger.log(`Error when checking latexindent: ${stderr}`);
                resolve(false);
            }
            else {
                logger.log(`Checking latexindent is ok: ${stdout}`);
                resolve(true);
            }
        });
    };
    return new Promise((resolve, _) => {
        logger.log(`Checking latexindent: ${checker} ${formatter}`);
        checkFormatter(resolve);
    });
}
function format(document, range) {
    return new Promise((resolve, _reject) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const useDocker = configuration.get('docker.enabled');
        if (!vscode.window.activeTextEditor) {
            logger.log('Exit formatting. The active textEditor is undefined.');
            return;
        }
        const options = vscode.window.activeTextEditor.options;
        const tabSize = options.tabSize ? +options.tabSize : 4;
        const useSpaces = options.insertSpaces;
        const indent = useSpaces ? ' '.repeat(tabSize) : '\\t';
        const documentDirectory = path.dirname(document.fileName);
        // The version of latexindent shipped with current latex distributions doesn't support piping in the data using stdin, support was
        // only added on 2018-01-13 with version 3.4 so we have to create a temporary file
        const textToFormat = document.getText(range);
        const temporaryFile = documentDirectory + path.sep + '__latexindent_temp_' + path.basename(document.fileName);
        fs.writeFileSync(temporaryFile, textToFormat);
        const removeTemporaryFiles = () => {
            try {
                fs.unlinkSync(temporaryFile);
                fs.unlinkSync(documentDirectory + path.sep + 'indent.log');
            }
            catch (ignored) {
            }
        };
        // generate command line arguments
        const rootFile = lw.manager.rootFile || document.fileName;
        const args = formatterArgs.map(arg => {
            return (0, utils_1.replaceArgumentPlaceholders)(rootFile, lw.manager.tmpDir)(arg)
                // ts specific tokens
                .replace(/%TMPFILE%/g, useDocker ? path.basename(temporaryFile) : temporaryFile.split(path.sep).join('/'))
                .replace(/%INDENT%/g, indent);
        });
        logger.logCommand('Formatting LaTeX.', formatter, args);
        const worker = cs.spawn(formatter, args, { stdio: 'pipe', cwd: documentDirectory });
        // handle stdout/stderr
        const stdoutBuffer = [];
        const stderrBuffer = [];
        worker.stdout.on('data', (chunk) => stdoutBuffer.push(chunk.toString()));
        worker.stderr.on('data', (chunk) => stderrBuffer.push(chunk.toString()));
        worker.on('error', err => {
            removeTemporaryFiles();
            void logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.');
            logger.log(`Formatting failed: ${err.message}`);
            logger.log(`stderr: ${stderrBuffer.join('')}`);
            resolve([]);
        });
        worker.on('close', code => {
            removeTemporaryFiles();
            if (code !== 0) {
                void logger.showErrorMessage('Formatting failed. Please refer to LaTeX Workshop Output for details.');
                logger.log(`Formatting failed with exit code ${code}`);
                logger.log(`stderr: ${stderrBuffer.join('')}`);
                return resolve([]);
            }
            const stdout = stdoutBuffer.join('');
            if (stdout !== '') {
                const edit = [vscode.TextEdit.replace(range || fullRange(document), stdout)];
                logger.log('Formatted ' + document.fileName);
                return resolve(edit);
            }
            return resolve([]);
        });
    });
}
class LatexFormatterProvider {
    constructor() {
        const machineOs = os.platform();
        const oss = [
            { name: 'win32', fileExt: '.exe', checker: 'where' },
            { name: 'linux', fileExt: '.pl', checker: 'which' },
            { name: 'darwin', fileExt: '.pl', checker: 'which' }
        ];
        currentOs = oss.find(system => system.name === machineOs);
        if (!currentOs) {
            logger.log('LaTexFormatter: Unsupported OS');
        }
        lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('latex-workshop.latexindent.path')) {
                formatter = '';
            }
        }));
    }
    provideDocumentFormattingEdits(document, _options, _token) {
        return formatDocument(document);
    }
    provideDocumentRangeFormattingEdits(document, range, _options, _token) {
        return formatDocument(document, range);
    }
}
exports.latexFormatterProvider = new LatexFormatterProvider();
//# sourceMappingURL=latexformatter.js.map