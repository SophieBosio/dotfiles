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
exports.AtSuggestionCompleter = exports.Completer = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lw = __importStar(require("../lw"));
const citation_1 = require("./completer/citation");
const documentclass_1 = require("./completer/documentclass");
const command_1 = require("./completer/command");
const environment_1 = require("./completer/environment");
const argument_1 = require("./completer/argument");
const atsuggestion_1 = require("./completer/atsuggestion");
const reference_1 = require("./completer/reference");
const package_1 = require("./completer/package");
const input_1 = require("./completer/input");
const glossary_1 = require("./completer/glossary");
const utils_1 = require("../utils/utils");
const logger_1 = require("../components/logger");
const logger = (0, logger_1.getLogger)('Intelli');
class Completer {
    constructor() {
        this.packagesLoaded = [];
        this.citation = new citation_1.Citation();
        this.environment = new environment_1.Environment(); // Must be created before command
        this.command = new command_1.Command();
        this.argument = new argument_1.Argument();
        this.documentClass = new documentclass_1.DocumentClass();
        this.reference = new reference_1.Reference();
        this.package = new package_1.Package();
        this.input = new input_1.Input();
        this.import = new input_1.Import();
        this.subImport = new input_1.SubImport();
        this.glossary = new glossary_1.Glossary();
        try {
            const environment = this.environment.initialize();
            this.command.initialize(environment);
        }
        catch (err) {
            logger.log(`Error reading data: ${err}.`);
        }
    }
    loadPackageData(packageName) {
        if (this.packagesLoaded.includes(packageName)) {
            return;
        }
        const filePath = this.resolvePackageFile(packageName);
        if (filePath === undefined) {
            this.packagesLoaded.push(packageName);
            return;
        }
        try {
            const packageData = JSON.parse(fs.readFileSync(filePath).toString());
            this.populatePackageData(packageData);
            this.package.setPackageDeps(packageName, packageData.includes);
            this.command.setPackageCmds(packageName, packageData.cmds);
            this.environment.setPackageEnvs(packageName, packageData.envs);
            this.package.setPackageOptions(packageName, packageData.options);
            this.packagesLoaded.push(packageName);
        }
        catch (e) {
            logger.log(`Cannot parse intellisense file: ${filePath}`);
        }
    }
    resolvePackageFile(packageName) {
        const defaultDir = `${lw.extensionRoot}/data/packages/`;
        const dirs = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.dirs');
        dirs.push(defaultDir);
        for (const dir of dirs) {
            const filePath = path.resolve(dir, `${packageName}.json`);
            if (fs.existsSync(filePath)) {
                return filePath;
            }
        }
        // Many package with names like toppackage-config.sty are just wrappers around
        // the general package toppacke.sty and do not define commands on their own.
        const indexDash = packageName.lastIndexOf('-');
        if (indexDash > -1) {
            const generalPkg = packageName.substring(0, indexDash);
            const filePath = path.resolve(defaultDir, `${generalPkg}.json`);
            if (fs.existsSync(filePath)) {
                return filePath;
            }
        }
        return;
    }
    populatePackageData(packageData) {
        Object.entries(packageData.cmds).forEach(([key, cmd]) => {
            cmd.command = key;
            cmd.snippet = cmd.snippet || key;
            cmd.keyvals = packageData.keyvals[cmd.keyvalindex ?? -1];
        });
        Object.entries(packageData.envs).forEach(([key, env]) => {
            env.detail = key;
            env.name = env.name || key;
            env.snippet = env.snippet || '';
            env.keyvals = packageData.keyvals[env.keyvalindex ?? -1];
        });
    }
    provideCompletionItems(document, position) {
        const currentLine = document.lineAt(position.line).text;
        if (position.character > 1 && currentLine[position.character - 1] === '\\' && currentLine[position.character - 2] === '\\') {
            return;
        }
        return this.provide({
            uri: document.uri,
            langId: document.languageId,
            line: document.lineAt(position).text,
            position
        });
    }
    provide(args) {
        // Note that the order of the following array affects the result.
        // 'command' must be at the last because it matches any commands.
        for (const type of ['citation', 'reference', 'environment', 'package', 'documentclass', 'input', 'subimport', 'import', 'includeonly', 'glossary', 'argument', 'command']) {
            const suggestions = this.completion(type, args);
            if (suggestions.length > 0) {
                if (type === 'citation') {
                    const configuration = vscode.workspace.getConfiguration('latex-workshop');
                    if (configuration.get('intellisense.citation.type') === 'browser') {
                        setTimeout(() => this.citation.browser(args), 10);
                        return;
                    }
                }
                return suggestions;
            }
        }
        return;
    }
    async resolveCompletionItem(item, token) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (item.kind === vscode.CompletionItemKind.Reference) {
            if (typeof item.documentation !== 'string') {
                return item;
            }
            const data = JSON.parse(item.documentation);
            const sug = {
                file: data.file,
                position: new vscode.Position(data.position.line, data.position.character)
            };
            if (!configuration.get('hover.ref.enabled')) {
                item.documentation = data.documentation;
                return item;
            }
            const tex = lw.mathPreview.findHoverOnRef(sug, data.key);
            if (tex) {
                const svgDataUrl = await lw.mathPreview.renderSvgOnRef(tex, data, token);
                item.documentation = new vscode.MarkdownString(`![equation](${svgDataUrl})`);
                return item;
            }
            else {
                item.documentation = data.documentation;
                return item;
            }
        }
        else if (item.kind === vscode.CompletionItemKind.File) {
            const preview = configuration.get('intellisense.includegraphics.preview.enabled');
            if (!preview) {
                return item;
            }
            const filePath = item.documentation;
            if (typeof filePath !== 'string') {
                return item;
            }
            const md = await lw.graphicsPreview.renderGraphicsAsMarkdownString(filePath, { height: 190, width: 300 });
            if (md === undefined) {
                return item;
            }
            const ret = new vscode.CompletionItem(item.label, vscode.CompletionItemKind.File);
            ret.documentation = md;
            return ret;
        }
        else {
            return item;
        }
    }
    completion(type, args) {
        let reg;
        let provider;
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:\([^[)]*\)){0,2}(?:<[^<>]*>|\[[^[\]]*\]|{[^{}]*})*{([^}]*)$)|(?:\\bibentry{([^}]*)$)/;
                provider = this.citation;
                break;
            case 'reference':
                reg = /(?:\\hyperref\[([^\]]*)(?!\])$)|(?:(?:\\(?!hyper)[a-zA-Z]*ref[a-zA-Z]*\*?(?:\[[^[\]]*\])?){([^}]*)$)|(?:\\[Cc][a-z]*refrange\*?{[^{}]*}{([^}]*)$)/;
                provider = this.reference;
                break;
            case 'environment':
                reg = /(?:\\begin|\\end){([^}]*)$/;
                provider = this.environment;
                break;
            case 'command':
                reg = args.langId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)$/ : /\\(\+?[a-zA-Z]*|(?:left|[Bb]ig{1,2}l)?[({[]?)$/;
                provider = this.command;
                break;
            case 'argument':
                reg = args.langId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)((?:\[.*?\]|{.*?})*)[[{][^[\]{}]*$/ : /\\(\+?[a-zA-Z]*)((?:\[.*?\]|{.*?})*)[[{][^[\]{}]*$/;
                provider = this.argument;
                break;
            case 'package':
                reg = /(?:\\usepackage(?:\[[^[\]]*\])*){([^}]*)$/;
                provider = this.package;
                break;
            case 'documentclass':
                reg = /(?:\\documentclass(?:\[[^[\]]*\])*){([^}]*)$/;
                provider = this.documentClass;
                break;
            case 'input':
                reg = /\\(input|include|subfile|subfileinclude|includegraphics|includesvg|lstinputlisting|verbatiminput|loadglsentries)\*?(?:\[[^[\]]*\])*{([^}]*)$/;
                provider = this.input;
                break;
            case 'includeonly':
                reg = /\\(includeonly|excludeonly){(?:{[^}]*},)*(?:[^,]*,)*{?([^},]*)$/;
                provider = this.input;
                break;
            case 'import':
                reg = /\\(import|includefrom|inputfrom)\*?(?:{([^}]*)})?{([^}]*)$/;
                provider = this.import;
                break;
            case 'subimport':
                reg = /\\(sub(?:import|includefrom|inputfrom))\*?(?:{([^}]*)})?{([^}]*)$/;
                provider = this.subImport;
                break;
            case 'glossary':
                reg = /\\(gls(?:pl|text|first|fmt(?:text|short|long)|plural|firstplural|name|symbol|desc|disp|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?)(?:\[[^[\]]*\])?{([^}]*)$/i;
                provider = this.glossary;
                break;
            default:
                // This shouldn't be possible, so mark as error case in log.
                logger.log(`Error - trying to complete unknown type ${type}`);
                return [];
        }
        let lineToPos = args.line.substring(0, args.position.character);
        if (type === 'argument') {
            lineToPos = lineToPos.replace(/(?<!\\begin){[^[\]{}]*}/g, '').replace(/\[[^[\]{}]*\]/g, '');
        }
        const result = lineToPos.match(reg);
        let suggestions = [];
        if (result) {
            suggestions = provider.provideFrom(result, args);
        }
        return suggestions;
    }
}
exports.Completer = Completer;
class AtSuggestionCompleter {
    constructor() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        this.triggerCharacter = configuration.get('intellisense.atSuggestion.trigger.latex');
        this.atSuggestion = new atsuggestion_1.AtSuggestion(this.triggerCharacter);
    }
    updateTrigger() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        this.triggerCharacter = configuration.get('intellisense.atSuggestion.trigger.latex');
        this.atSuggestion = new atsuggestion_1.AtSuggestion(this.triggerCharacter);
    }
    provideCompletionItems(document, position) {
        return this.provide({
            uri: document.uri,
            langId: document.languageId,
            line: document.lineAt(position).text,
            position
        });
    }
    provide(args) {
        const escapedTriggerCharacter = (0, utils_1.escapeRegExp)(this.triggerCharacter);
        const reg = new RegExp(escapedTriggerCharacter + '[^\\\\s]*$');
        const result = args.line.substring(0, args.position.character).match(reg);
        let suggestions = [];
        if (result) {
            suggestions = this.atSuggestion.provideFrom(result, args);
        }
        return suggestions;
    }
}
exports.AtSuggestionCompleter = AtSuggestionCompleter;
//# sourceMappingURL=completion.js.map