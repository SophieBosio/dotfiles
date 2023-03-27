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
exports.NewCommandFinder = void 0;
const vscode = __importStar(require("vscode"));
const latex_utensils_1 = require("latex-utensils");
const utils_1 = require("../../../utils/utils");
const path = __importStar(require("path"));
const lw = __importStar(require("../../../lw"));
const logger_1 = require("../../../components/logger");
const parser_1 = require("../../../components/parser");
const logger = (0, logger_1.getLogger)('Preview', 'Math');
class NewCommandFinder {
    static postProcessNewCommands(commands) {
        return commands.replace(/\\providecommand/g, '\\newcommand')
            .replace(/\\newcommand\*/g, '\\newcommand')
            .replace(/\\renewcommand\*/g, '\\renewcommand')
            .replace(/\\DeclarePairedDelimiter{(\\[a-zA-Z]+)}{([^{}]*)}{([^{}]*)}/g, '\\newcommand{$1}[2][]{#1$2 #2 #1$3}');
    }
    static async loadNewCommandFromConfigFile(newCommandFile) {
        let commandsString = '';
        if (newCommandFile === '') {
            return commandsString;
        }
        let newCommandFileAbs;
        if (path.isAbsolute(newCommandFile)) {
            newCommandFileAbs = newCommandFile;
        }
        else {
            if (lw.manager.rootFile === undefined) {
                await lw.manager.findRoot();
            }
            const rootDir = lw.manager.rootDir;
            if (rootDir === undefined) {
                logger.log(`Cannot identify the absolute path of new command file ${newCommandFile} without root file.`);
                return '';
            }
            newCommandFileAbs = path.join(rootDir, newCommandFile);
        }
        commandsString = lw.lwfs.readFileSyncGracefully(newCommandFileAbs);
        if (commandsString === undefined) {
            logger.log(`Cannot read file ${newCommandFileAbs}`);
            return '';
        }
        commandsString = commandsString.replace(/^\s*$/gm, '');
        commandsString = NewCommandFinder.postProcessNewCommands(commandsString);
        return commandsString;
    }
    static async findProjectNewCommand(ctoken) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const newCommandFile = configuration.get('hover.preview.newcommand.newcommandFile');
        let commandsInConfigFile = '';
        if (newCommandFile !== '') {
            commandsInConfigFile = await NewCommandFinder.loadNewCommandFromConfigFile(newCommandFile);
        }
        if (!configuration.get('hover.preview.newcommand.parseTeXFile.enabled')) {
            return commandsInConfigFile;
        }
        let commands = [];
        let exceeded = false;
        setTimeout(() => { exceeded = true; }, 5000);
        for (const tex of lw.cacher.getIncludedTeX()) {
            if (ctoken?.isCancellationRequested) {
                return '';
            }
            if (exceeded) {
                logger.log('Timeout error when parsing preambles in findProjectNewCommand.');
                throw new Error('Timeout Error in findProjectNewCommand');
            }
            const content = lw.cacher.get(tex)?.content;
            if (content === undefined) {
                continue;
            }
            commands = commands.concat(await NewCommandFinder.findNewCommand(content));
        }
        return commandsInConfigFile + '\n' + NewCommandFinder.postProcessNewCommands(commands.join(''));
    }
    static async findNewCommand(content) {
        let commands = [];
        try {
            const ast = await parser_1.parser.parseLatexPreamble(content);
            for (const node of ast.content) {
                if (((0, utils_1.isNewCommand)(node) || latex_utensils_1.latexParser.isDefCommand(node)) && node.args.length > 0) {
                    node.name = node.name.replace(/\*$/, '');
                    const s = latex_utensils_1.latexParser.stringify(node);
                    commands.push(s);
                }
                else if (latex_utensils_1.latexParser.isCommand(node) && node.name === 'DeclarePairedDelimiter' && node.args.length === 3) {
                    const name = latex_utensils_1.latexParser.stringify(node.args[0]);
                    const leftDelim = latex_utensils_1.latexParser.stringify(node.args[1]).slice(1, -1);
                    const rightDelim = latex_utensils_1.latexParser.stringify(node.args[2]).slice(1, -1);
                    const s = `\\newcommand${name}[2][]{#1${leftDelim} #2 #1${rightDelim}}`;
                    commands.push(s);
                }
            }
        }
        catch (e) {
            commands = [];
            const regex = /(\\(?:(?:(?:(?:re)?new|provide)command|DeclareMathOperator)(\*)?{\\[a-zA-Z]+}(?:\[[^[\]{}]*\])*{.*})|\\(?:def\\[a-zA-Z]+(?:#[0-9])*{.*})|\\DeclarePairedDelimiter{\\[a-zA-Z]+}{[^{}]*}{[^{}]*})/gm;
            const noCommentContent = (0, utils_1.stripCommentsAndVerbatim)(content);
            let result;
            do {
                result = regex.exec(noCommentContent);
                if (result) {
                    let command = result[1];
                    if (result[2]) {
                        command = command.replace('*', '');
                    }
                    commands.push(command);
                }
            } while (result);
        }
        return commands;
    }
}
exports.NewCommandFinder = NewCommandFinder;
//# sourceMappingURL=newcommandfinder.js.map