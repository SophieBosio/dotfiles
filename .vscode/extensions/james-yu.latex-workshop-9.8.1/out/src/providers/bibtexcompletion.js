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
exports.BibtexCompleter = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const lw = __importStar(require("../lw"));
const bibtexutils_1 = require("./bibtexformatterlib/bibtexutils");
const logger_1 = require("../components/logger");
const logger = (0, logger_1.getLogger)('Intelli', 'Bib');
class BibtexCompleter {
    constructor() {
        this.scope = undefined;
        this.entryItems = [];
        this.optFieldItems = Object.create(null);
        if (vscode.window.activeTextEditor) {
            this.scope = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
        }
        else {
            this.scope = vscode.workspace.workspaceFolders?.[0];
        }
        this.bibtexFormatConfig = (0, bibtexutils_1.getBibtexFormatConfig)(this.scope);
        this.initialize();
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('latex-workshop.bibtex-format', this.scope) ||
                e.affectsConfiguration('latex-workshop.bibtex-entries', this.scope) ||
                e.affectsConfiguration('latex-workshop.bibtex-fields', this.scope) ||
                e.affectsConfiguration('latex-workshop.intellisense', this.scope)) {
                this.bibtexFormatConfig = (0, bibtexutils_1.getBibtexFormatConfig)(this.scope);
                this.initialize();
            }
        });
        vscode.window.onDidChangeActiveTextEditor((e) => {
            if (e && lw.manager.hasBibtexId(e.document.languageId)) {
                const wsFolder = vscode.workspace.getWorkspaceFolder(e.document.uri);
                if (wsFolder !== this.scope) {
                    this.scope = wsFolder;
                    this.bibtexFormatConfig = (0, bibtexutils_1.getBibtexFormatConfig)(this.scope);
                    this.initialize();
                }
            }
        });
    }
    initialize() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', this.scope);
        const citationBackend = configuration.get('intellisense.citation.backend');
        let entriesFile = '';
        let optEntriesFile = '';
        let entriesReplacements = {};
        switch (citationBackend) {
            case 'bibtex':
                entriesFile = `${lw.extensionRoot}/data/bibtex-entries.json`;
                optEntriesFile = `${lw.extensionRoot}/data/bibtex-optional-entries.json`;
                entriesReplacements = configuration.get('intellisense.bibtexJSON.replace');
                break;
            case 'biblatex':
                entriesFile = `${lw.extensionRoot}/data/biblatex-entries.json`;
                optEntriesFile = `${lw.extensionRoot}/data/biblatex-optional-entries.json`;
                entriesReplacements = configuration.get('intellisense.biblatexJSON.replace');
                break;
            default:
                logger.log(`Unknown citation backend: ${citationBackend}`);
                return;
        }
        try {
            this.loadDefaultItems(entriesFile, optEntriesFile, entriesReplacements);
        }
        catch (err) {
            logger.log(`Error reading data: ${err}.`);
        }
    }
    loadDefaultItems(entriesFile, optEntriesFile, entriesReplacements) {
        const entries = JSON.parse(fs.readFileSync(entriesFile, { encoding: 'utf8' }));
        const optFields = JSON.parse(fs.readFileSync(optEntriesFile, { encoding: 'utf8' }));
        const maxLengths = this.computeMaxLengths(entries, optFields);
        const entriesList = [];
        this.entryItems.length = 0;
        Object.keys(entries).forEach(entry => {
            if (entry in entriesList) {
                return;
            }
            if (entry in entriesReplacements) {
                this.entryItems.push(this.entryToCompletion(entry, entriesReplacements[entry], this.bibtexFormatConfig, maxLengths));
            }
            else {
                this.entryItems.push(this.entryToCompletion(entry, entries[entry], this.bibtexFormatConfig, maxLengths));
            }
            entriesList.push(entry);
        });
        Object.entries(optFields).forEach(([field, item]) => {
            this.optFieldItems[field] = this.fieldsToCompletion(field, item, this.bibtexFormatConfig, maxLengths);
        });
    }
    computeMaxLengths(entries, optFields) {
        const maxLengths = Object.create(null);
        Object.keys(entries).forEach(key => {
            let maxFieldLength = 0;
            entries[key].forEach(field => {
                maxFieldLength = Math.max(maxFieldLength, field.length);
            });
            if (key in optFields) {
                optFields[key].forEach(field => {
                    maxFieldLength = Math.max(maxFieldLength, field.length);
                });
            }
            maxLengths[key] = maxFieldLength;
        });
        return maxLengths;
    }
    entryToCompletion(itemName, itemFields, config, maxLengths) {
        const suggestion = new vscode.CompletionItem(itemName, vscode.CompletionItemKind.Snippet);
        suggestion.detail = itemName;
        suggestion.documentation = `Add a @${itemName} entry`;
        let count = 1;
        // The following code is copied from BibtexUtils.bibtexFormat
        // Find the longest field name in entry
        let s = itemName + '{${0:key}';
        itemFields.forEach(field => {
            s += ',\n' + config.tab + (config.case === 'lowercase' ? field.toLowerCase() : field.toUpperCase());
            s += ' '.repeat(maxLengths[itemName] - field.length) + ' = ';
            s += config.left + `$${count}` + config.right;
            count++;
        });
        s += '\n}';
        suggestion.insertText = new vscode.SnippetString(s);
        return suggestion;
    }
    fieldsToCompletion(itemName, fields, config, maxLengths) {
        const suggestions = [];
        fields.forEach(field => {
            const suggestion = new vscode.CompletionItem(field, vscode.CompletionItemKind.Snippet);
            suggestion.detail = field;
            suggestion.documentation = `Add ${field} = ${config.left}${config.right}`;
            suggestion.insertText = new vscode.SnippetString(`${field}` + ' '.repeat(maxLengths[itemName] - field.length) + ` = ${config.left}$1${config.right},`);
            suggestions.push(suggestion);
        });
        return suggestions;
    }
    provideCompletionItems(document, position) {
        const currentLine = document.lineAt(position.line).text;
        if (currentLine.match(/@[a-zA-Z]*$/)) {
            // Complete an entry name
            return this.entryItems;
        }
        else {
            const prevLine = position.line > 0 ? document.lineAt(position.line - 1).text : '';
            if (currentLine.match(/^\s*[a-zA-Z]*/) && prevLine.match(/(?:@[a-zA-Z]{)|(?:["}0-9],\s*$)/)) {
                // Add optional fields
                const optFields = this.provideOptFields(document, position);
                return optFields;
            }
        }
        return;
    }
    provideOptFields(document, position) {
        const pattern = /^\s*@([a-zA-Z]+)\{(?:[^,]*,)?\s$/m;
        const content = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const reversedContent = content.replace(/(\r\n)|\r/g, '\n').split('\n').reverse().join('\n');
        const match = reversedContent.match(pattern);
        if (match) {
            const entryType = match[1].toLowerCase();
            if (entryType in this.optFieldItems) {
                return this.optFieldItems[entryType];
            }
        }
        return [];
    }
}
exports.BibtexCompleter = BibtexCompleter;
//# sourceMappingURL=bibtexcompletion.js.map