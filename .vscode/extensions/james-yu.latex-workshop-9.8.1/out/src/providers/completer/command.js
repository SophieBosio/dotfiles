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
exports.Command = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const lw = __importStar(require("../../lw"));
const commandfinder_1 = require("./commandlib/commandfinder");
const completerutils_1 = require("./completerutils");
const commandfinder_2 = require("./commandlib/commandfinder");
const surround_1 = require("./commandlib/surround");
const environment_1 = require("./environment");
const logger_1 = require("../../components/logger");
const logger = (0, logger_1.getLogger)('Intelli', 'Command');
function isCmdWithSnippet(obj) {
    return (typeof obj.command === 'string') && (typeof obj.snippet === 'string');
}
class Command {
    constructor() {
        this.defaultCmds = [];
        this._defaultSymbols = [];
        this.packageCmds = new Map();
        lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e) => {
            if (!e.affectsConfiguration('latex-workshop.intellisense.command.user') &&
                !e.affectsConfiguration('latex-workshop.intellisense.package.exclude')) {
                return;
            }
            this.initialize(lw.completer.environment);
        }));
    }
    initialize(environment) {
        const excludeDefault = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.exclude').includes('lw-default');
        const cmds = excludeDefault ? {} : JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/commands.json`, { encoding: 'utf8' }));
        const maths = excludeDefault ? {} : JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/packages/tex.json`, { encoding: 'utf8' })).cmds;
        Object.assign(maths, cmds);
        Object.entries(maths).forEach(([key, cmd]) => {
            cmd.command = key;
            cmd.snippet = cmd.snippet || key;
        });
        const defaultEnvs = environment.getDefaultEnvs(environment_1.EnvSnippetType.AsCommand);
        const userCmds = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.command.user');
        Object.entries(userCmds).forEach(([key, snippet]) => {
            if (maths[key] && snippet !== '') {
                maths[key].snippet = snippet;
            }
            else if (maths[key] && snippet === '') {
                delete maths[key];
            }
            else {
                maths[key] = { snippet };
            }
        });
        this.defaultCmds = [];
        // Initialize default commands and the ones in `tex.json`
        Object.entries(maths).forEach(([key, cmd]) => this.defaultCmds.push(this.entryCmdToCompletion(key, cmd)));
        // Initialize default env begin-end pairs
        defaultEnvs.forEach(cmd => {
            this.defaultCmds.push(cmd);
        });
    }
    get definedCmds() {
        return commandfinder_1.CommandFinder.definedCmds;
    }
    get defaultSymbols() {
        if (this._defaultSymbols.length > 0) {
            return this._defaultSymbols;
        }
        const symbols = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/unimathsymbols.json`).toString());
        Object.entries(symbols).forEach(([key, symbol]) => this._defaultSymbols.push(this.entryCmdToCompletion(key, symbol)));
        return this._defaultSymbols;
    }
    getDefaultCmds() {
        return this.defaultCmds;
    }
    provideFrom(result, args) {
        const suggestions = this.provide(args.langId, args.line, args.position);
        // Commands ending with (, { or [ are not filtered properly by vscode intellisense. So we do it by hand.
        if (result[0].match(/[({[]$/)) {
            const exactSuggestion = suggestions.filter(entry => entry.label === result[0]);
            if (exactSuggestion.length > 0) {
                return exactSuggestion;
            }
        }
        // Commands starting with a non letter character are not filtered properly because of wordPattern definition.
        return (0, completerutils_1.filterNonLetterSuggestions)(suggestions, result[1], args.position);
    }
    provide(langId, line, position) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled');
        let range = undefined;
        if (line && position) {
            const startPos = line.lastIndexOf('\\', position.character - 1);
            if (startPos >= 0) {
                range = new vscode.Range(position.line, startPos + 1, position.line, position.character);
            }
        }
        const suggestions = [];
        const cmdDuplicationDetector = new commandfinder_2.CommandSignatureDuplicationDetector();
        // Insert default commands
        this.defaultCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return;
            }
            cmd.range = range;
            suggestions.push(cmd);
            cmdDuplicationDetector.add(cmd);
        });
        // Insert unimathsymbols
        if (configuration.get('intellisense.unimathsymbols.enabled')) {
            this.defaultSymbols.forEach(symbol => {
                suggestions.push(symbol);
                cmdDuplicationDetector.add(symbol);
            });
        }
        // Insert commands from packages
        if ((configuration.get('intellisense.package.enabled'))) {
            const packages = lw.completer.package.getPackagesIncluded(langId);
            Object.entries(packages).forEach(([packageName, options]) => {
                this.provideCmdInPkg(packageName, options, suggestions, cmdDuplicationDetector);
                lw.completer.environment.provideEnvsAsCommandInPkg(packageName, options, suggestions, cmdDuplicationDetector);
            });
        }
        // Start working on commands in tex. To avoid over populating suggestions, we do not include
        // user defined commands, whose name matches a default command or one provided by a package
        const commandSignatureDuplicationDetector = new commandfinder_2.CommandSignatureDuplicationDetector(suggestions);
        lw.cacher.getIncludedTeX().forEach(tex => {
            const cmds = lw.cacher.get(tex)?.elements.command;
            if (cmds !== undefined) {
                cmds.forEach(cmd => {
                    if (!commandSignatureDuplicationDetector.has(cmd)) {
                        cmd.range = range;
                        suggestions.push(cmd);
                        commandSignatureDuplicationDetector.add(cmd);
                    }
                });
            }
        });
        (0, completerutils_1.filterArgumentHint)(suggestions);
        return suggestions;
    }
    /**
     * Surrounds `content` with a command picked in QuickPick.
     *
     * @param content A string to be surrounded. If not provided, then we loop over all the selections and surround each of them.
     */
    surround() {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        const cmdItems = this.provide(editor.document.languageId);
        surround_1.SurroundCommand.surround(cmdItems);
    }
    /**
     * Updates the Manager cache for commands used in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    update(file, nodes, content) {
        // First, we must update the package list
        lw.completer.package.updateUsepackage(file, nodes, content);
        // Remove newcommand cmds, because they will be re-insert in the next step
        this.definedCmds.forEach((entry, cmd) => {
            if (entry.file === file) {
                this.definedCmds.delete(cmd);
            }
        });
        const cache = lw.cacher.get(file);
        if (cache === undefined) {
            return;
        }
        const cmdInPkg = [];
        const packages = lw.completer.package.getPackagesIncluded('latex-expl3');
        Object.entries(packages).forEach(([packageName, options]) => {
            this.provideCmdInPkg(packageName, options, cmdInPkg, new commandfinder_2.CommandSignatureDuplicationDetector());
        });
        if (nodes !== undefined) {
            cache.elements.command = commandfinder_1.CommandFinder.getCmdFromNodeArray(file, nodes, cmdInPkg, new commandfinder_2.CommandSignatureDuplicationDetector());
        }
        else if (content !== undefined) {
            cache.elements.command = commandfinder_1.CommandFinder.getCmdFromContent(file, content, cmdInPkg);
        }
    }
    entryCmdToCompletion(itemKey, item) {
        item.command = item.command || itemKey;
        const backslash = item.command.startsWith(' ') ? '' : '\\';
        const suggestion = new completerutils_1.CmdEnvSuggestion(`${backslash}${item.command}`, item.package || 'latex', item.keyvals && typeof (item.keyvals) !== 'number' ? item.keyvals : [], item.keyvalpos === undefined ? -1 : item.keyvalpos, (0, completerutils_1.splitSignatureString)(itemKey), vscode.CompletionItemKind.Function, item.option);
        if (item.snippet) {
            // Wrap the selected text when there is a single placeholder
            if (!(item.snippet.match(/\$\{?2/) || (item.snippet.match(/\$\{?0/) && item.snippet.match(/\$\{?1/)))) {
                item.snippet = item.snippet.replace(/\$1|\$\{1\}/, '$${1:$${TM_SELECTED_TEXT}}').replace(/\$\{1:([^$}]+)\}/, '$${1:$${TM_SELECTED_TEXT:$1}}');
            }
            suggestion.insertText = new vscode.SnippetString(item.snippet);
        }
        else {
            suggestion.insertText = item.command;
        }
        suggestion.filterText = itemKey;
        suggestion.detail = item.detail || `\\${item.snippet?.replace(/\$\{\d+:([^$}]*)\}/g, '$1')}`;
        suggestion.documentation = item.documentation ? item.documentation : `Command \\${item.command}.`;
        if (item.package) {
            suggestion.documentation += ` From package: ${item.package}.`;
        }
        suggestion.sortText = item.command.replace(/^[a-zA-Z]/, c => {
            const n = c.match(/[a-z]/) ? c.toUpperCase().charCodeAt(0) : c.toLowerCase().charCodeAt(0);
            return n !== undefined ? n.toString(16) : c;
        });
        if (item.postAction) {
            suggestion.command = { title: 'Post-Action', command: item.postAction };
        }
        else if ((0, commandfinder_1.isTriggerSuggestNeeded)(item.command)) {
            // Automatically trigger completion if the command is for citation, filename, reference or glossary
            suggestion.command = { title: 'Post-Action', command: 'editor.action.triggerSuggest' };
        }
        return suggestion;
    }
    setPackageCmds(packageName, cmds) {
        const commands = [];
        Object.entries(cmds).forEach(([key, cmd]) => {
            cmd.package = packageName;
            if (isCmdWithSnippet(cmd)) {
                commands.push(this.entryCmdToCompletion(key, cmd));
            }
            else {
                logger.log(`Cannot parse intellisense file for ${packageName}.`);
                logger.log(`Missing field in entry: "${key}": ${JSON.stringify(cmd)}.`);
            }
        });
        this.packageCmds.set(packageName, commands);
    }
    getPackageCmds(packageName) {
        return this.packageCmds.get(packageName) || [];
    }
    provideCmdInPkg(packageName, options, suggestions, cmdDuplicationDetector) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const useOptionalArgsEntries = configuration.get('intellisense.optionalArgsEntries.enabled');
        // Load command in pkg
        lw.completer.loadPackageData(packageName);
        // No package command defined
        const pkgCmds = this.packageCmds.get(packageName);
        if (!pkgCmds || pkgCmds.length === 0) {
            return;
        }
        // Insert commands
        pkgCmds.forEach(cmd => {
            if (!useOptionalArgsEntries && cmd.hasOptionalArgs()) {
                return;
            }
            if (!cmdDuplicationDetector.has(cmd)) {
                if (cmd.option && options && !options.includes(cmd.option)) {
                    return;
                }
                suggestions.push(cmd);
                cmdDuplicationDetector.add(cmd);
            }
        });
    }
}
exports.Command = Command;
//# sourceMappingURL=command.js.map