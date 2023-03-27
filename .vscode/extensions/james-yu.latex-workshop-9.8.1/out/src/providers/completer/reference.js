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
exports.Reference = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const latex_utensils_1 = require("latex-utensils");
const lw = __importStar(require("../../lw"));
const utils_1 = require("../../utils/utils");
const completerutils_1 = require("./completerutils");
class Reference {
    constructor() {
        // Here we use an object instead of an array for de-duplication
        this.suggestions = new Map();
        this.prevIndexObj = new Map();
        this.envsToSkip = ['tikzpicture'];
    }
    provideFrom(_result, args) {
        return this.provide(args.line, args.position);
    }
    provide(line, position) {
        // Compile the suggestion object to array
        this.updateAll(line, position);
        let keys = [...this.suggestions.keys(), ...this.prevIndexObj.keys()];
        keys = Array.from(new Set(keys));
        const items = [];
        for (const key of keys) {
            const sug = this.suggestions.get(key);
            if (sug) {
                const data = {
                    documentation: sug.documentation,
                    file: sug.file,
                    position: {
                        line: sug.position.line,
                        character: sug.position.character
                    },
                    key,
                    label: sug.label,
                    prevIndex: sug.prevIndex
                };
                sug.documentation = JSON.stringify(data);
                items.push(sug);
            }
            else {
                items.push({ label: key });
            }
        }
        return items;
    }
    /**
     * Updates the Manager cache for references defined in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param lines The lines of the content. They are used to generate the documentation of completion items.
     * @param content The content of a LaTeX file.
     */
    update(file, nodes, lines, content) {
        const cache = lw.cacher.get(file);
        if (cache === undefined) {
            return;
        }
        if (nodes !== undefined && lines !== undefined) {
            cache.elements.reference = this.getRefFromNodeArray(nodes, lines);
        }
        else if (content !== undefined) {
            cache.elements.reference = this.getRefFromContent(content);
        }
    }
    getRef(token) {
        this.updateAll();
        return this.suggestions.get(token);
    }
    updateAll(line, position) {
        if (!lw.manager.rootFile) {
            this.suggestions.clear();
            return;
        }
        const included = new Set([lw.manager.rootFile]);
        // Included files may originate from \input or `xr`. If the latter, a
        // prefix may be used to ref to the file. The following obj holds them.
        const prefixes = {};
        while (true) {
            // The process adds newly included file recursively, only stops when
            // all have been found, i.e., no new ones
            const startSize = included.size;
            included.forEach(cachedFile => {
                lw.cacher.getIncludedTeX(cachedFile).forEach(includedTeX => {
                    if (includedTeX === cachedFile) {
                        return;
                    }
                    included.add(includedTeX);
                    // If the file is indeed included by \input, but was
                    // previously included by `xr`, the possible prefix is
                    // removed as it can be directly referenced without.
                    delete prefixes[includedTeX];
                });
                const cache = lw.cacher.get(cachedFile);
                if (!cache) {
                    return;
                }
                Object.keys(cache.external).forEach(external => {
                    // Don't repeatedly add, no matter previously by \input or
                    // `xr`
                    if (included.has(external)) {
                        return;
                    }
                    // If the file is included by `xr`, both file path and
                    // prefix is recorded.
                    included.add(external);
                    prefixes[external] = cache.external[external];
                });
            });
            if (included.size === startSize) {
                break;
            }
        }
        // Extract cached references
        const refList = [];
        let range = undefined;
        if (line && position) {
            range = (0, completerutils_1.computeFilteringRange)(line, position);
        }
        included.forEach(cachedFile => {
            const cachedRefs = lw.cacher.get(cachedFile)?.elements.reference;
            if (cachedRefs === undefined) {
                return;
            }
            cachedRefs.forEach(ref => {
                if (ref.range === undefined) {
                    return;
                }
                const label = (cachedFile in prefixes ? prefixes[cachedFile] : '') + ref.label;
                this.suggestions.set(label, { ...ref,
                    label,
                    file: cachedFile,
                    position: 'inserting' in ref.range ? ref.range.inserting.start : ref.range.start,
                    range,
                    prevIndex: this.prevIndexObj.get(label)
                });
                refList.push(label);
            });
        });
        // Remove references that have been deleted
        this.suggestions.forEach((_, key) => {
            if (!refList.includes(key)) {
                this.suggestions.delete(key);
            }
        });
    }
    // This function will return all references in a node array, including sub-nodes
    getRefFromNodeArray(nodes, lines) {
        let refs = [];
        for (let index = 0; index < nodes.length; ++index) {
            if (index < nodes.length - 1) {
                // Also pass the next node to handle cases like `label={some-text}`
                refs = refs.concat(this.getRefFromNode(nodes[index], lines, nodes[index + 1]));
            }
            else {
                refs = refs.concat(this.getRefFromNode(nodes[index], lines));
            }
        }
        return refs;
    }
    // This function will return the reference defined by the node, or all references in `content`
    getRefFromNode(node, lines, nextNode) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const labelCmdNames = configuration.get('intellisense.label.command');
        const useLabelKeyVal = configuration.get('intellisense.label.keyval');
        const refs = [];
        let label = '';
        if ((0, utils_1.isNewCommand)(node) || (0, utils_1.isNewEnvironment)(node) || latex_utensils_1.latexParser.isDefCommand(node)) {
            // Do not scan labels inside \newcommand, \newenvironment & co
            return refs;
        }
        if (latex_utensils_1.latexParser.isEnvironment(node) && this.envsToSkip.includes(node.name)) {
            return refs;
        }
        if (latex_utensils_1.latexParser.isLabelCommand(node) && labelCmdNames.includes(node.name)) {
            // \label{some-text}
            label = node.label;
        }
        else if (latex_utensils_1.latexParser.isCommand(node) && labelCmdNames.includes(node.name)
            && node.args.length === 1
            && latex_utensils_1.latexParser.isGroup(node.args[0])) {
            // \linelabel{actual_label}
            label = latex_utensils_1.latexParser.stringify(node.args[0]).slice(1, -1);
        }
        else if (latex_utensils_1.latexParser.isCommand(node) && labelCmdNames.includes(node.name)
            && node.args.length === 2
            && latex_utensils_1.latexParser.isOptionalArg(node.args[0])
            && latex_utensils_1.latexParser.isGroup(node.args[1])) {
            // \label[opt_arg]{actual_label}
            label = latex_utensils_1.latexParser.stringify(node.args[1]).slice(1, -1);
        }
        else if (latex_utensils_1.latexParser.isTextString(node) && node.content === 'label='
            && useLabelKeyVal && nextNode !== undefined) {
            // label={some-text}
            label = latex_utensils_1.latexParser.stringify(nextNode).slice(1, -1);
        }
        if (label !== '' &&
            (latex_utensils_1.latexParser.isLabelCommand(node)
                || latex_utensils_1.latexParser.isCommand(node)
                || latex_utensils_1.latexParser.isTextString(node))) {
            refs.push({
                label,
                kind: vscode.CompletionItemKind.Reference,
                // One row before, four rows after
                documentation: lines.slice(node.location.start.line - 2, node.location.end.line + 4).join('\n'),
                // Here we abuse the definition of range to store the location of the reference definition
                range: new vscode.Range(node.location.start.line - 1, node.location.start.column, node.location.end.line - 1, node.location.end.column)
            });
            return refs;
        }
        if (latex_utensils_1.latexParser.hasContentArray(node)) {
            return this.getRefFromNodeArray(node.content, lines);
        }
        if (latex_utensils_1.latexParser.hasArgsArray(node)) {
            return this.getRefFromNodeArray(node.args, lines);
        }
        if (latex_utensils_1.latexParser.isLstlisting(node)) {
            const arg = node.arg;
            if (arg) {
                return this.getRefFromNode(arg, lines);
            }
        }
        return refs;
    }
    getRefFromContent(content) {
        const refReg = /(?:\\label(?:\[[^[\]{}]*\])?|(?:^|[,\s])label=){([^#\\}]*)}/gm;
        const refs = [];
        const refList = [];
        content = (0, utils_1.stripEnvironments)(content, this.envsToSkip);
        while (true) {
            const result = refReg.exec(content);
            if (result === null) {
                break;
            }
            if (refList.includes(result[1])) {
                continue;
            }
            const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n') - 1);
            const followLength = content.substring(result.index, content.length).split('\n', 4).join('\n').length;
            const positionContent = content.substring(0, result.index).split('\n');
            refs.push({
                label: result[1],
                kind: vscode.CompletionItemKind.Reference,
                // One row before, four rows after
                documentation: content.substring(prevContent.lastIndexOf('\n') + 1, result.index + followLength),
                // Here we abuse the definition of range to store the location of the reference definition
                range: new vscode.Range(positionContent.length - 1, positionContent[positionContent.length - 1].length, positionContent.length - 1, positionContent[positionContent.length - 1].length)
            });
            refList.push(result[1]);
        }
        return refs;
    }
    setNumbersFromAuxFile(rootFile) {
        const outDir = lw.manager.getOutDir(rootFile);
        const rootDir = path.dirname(rootFile);
        const auxFile = path.resolve(rootDir, path.join(outDir, path.basename(rootFile, '.tex') + '.aux'));
        this.suggestions.forEach((entry) => {
            entry.prevIndex = undefined;
        });
        this.prevIndexObj = new Map();
        if (!fs.existsSync(auxFile)) {
            return;
        }
        const newLabelReg = /^\\newlabel\{(.*?)\}\{\{(.*?)\}\{(.*?)\}/gm;
        const auxContent = fs.readFileSync(auxFile, { encoding: 'utf8' });
        while (true) {
            const result = newLabelReg.exec(auxContent);
            if (result === null) {
                break;
            }
            if (result[1].endsWith('@cref') && this.prevIndexObj.has(result[1].replace('@cref', ''))) {
                // Drop extra \newlabel entries added by cleveref
                continue;
            }
            this.prevIndexObj.set(result[1], { refNumber: result[2], pageNumber: result[3] });
            const ent = this.suggestions.get(result[1]);
            if (ent) {
                ent.prevIndex = { refNumber: result[2], pageNumber: result[3] };
            }
        }
    }
}
exports.Reference = Reference;
//# sourceMappingURL=reference.js.map