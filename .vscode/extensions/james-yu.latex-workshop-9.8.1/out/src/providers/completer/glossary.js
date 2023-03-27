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
exports.Glossary = void 0;
const vscode = __importStar(require("vscode"));
const latex_utensils_1 = require("latex-utensils");
const lw = __importStar(require("../../lw"));
var GlossaryType;
(function (GlossaryType) {
    GlossaryType[GlossaryType["glossary"] = 0] = "glossary";
    GlossaryType[GlossaryType["acronym"] = 1] = "acronym";
})(GlossaryType || (GlossaryType = {}));
class Glossary {
    constructor() {
        // use object for deduplication
        this.glossaries = new Map();
        this.acronyms = new Map();
    }
    provideFrom(result) {
        return this.provide(result);
    }
    provide(result) {
        this.updateAll();
        let suggestions;
        if (result[1] && result[1].match(/^ac/i)) {
            suggestions = this.acronyms;
        }
        else {
            suggestions = new Map([...this.acronyms, ...this.glossaries]);
        }
        // Compile the suggestion object to array
        const items = Array.from(suggestions.values());
        return items;
    }
    getGlossaryFromNodeArray(nodes, file) {
        const glossaries = [];
        let entry;
        let type;
        nodes.forEach(node => {
            if (latex_utensils_1.latexParser.isCommand(node) && node.args.length > 0) {
                if (['newglossaryentry', 'provideglossaryentry'].includes(node.name)) {
                    type = GlossaryType.glossary;
                    entry = this.getShortNodeDescription(node);
                }
                else if (['longnewglossaryentry', 'longprovideglossaryentry'].includes(node.name)) {
                    type = GlossaryType.glossary;
                    entry = this.getLongNodeLabelDescription(node);
                }
                else if (['newacronym', 'newabbreviation', 'newabbr'].includes(node.name)) {
                    type = GlossaryType.acronym;
                    entry = this.getLongNodeLabelDescription(node);
                }
                if (type !== undefined && entry.description !== undefined && entry.label !== undefined) {
                    glossaries.push({
                        type,
                        file,
                        position: new vscode.Position(node.location.start.line - 1, node.location.start.column - 1),
                        label: entry.label,
                        detail: entry.description,
                        kind: vscode.CompletionItemKind.Reference
                    });
                }
            }
        });
        return glossaries;
    }
    /**
     * Parse the description from "long nodes" such as \newacronym and \longnewglossaryentry
     *
     * Spec: \newacronym[〈key-val list〉]{〈label〉}{〈abbrv〉}{〈description〉}
     *
     * Fairly straightforward, a \newacronym command takes the form
     *     \newacronym[optional parameters]{lw}{LW}{LaTeX Workshop}
     *
     *
     * @param node the \newacronym node from the parser
     * @return the pair (label, description)
     */
    getLongNodeLabelDescription(node) {
        let description = undefined;
        let label = undefined;
        // We expect 3 arguments + 1 optional argument
        if (node.args.length < 3 || node.args.length > 4) {
            return { label: undefined, description: undefined };
        }
        const hasOptionalArg = latex_utensils_1.latexParser.isOptionalArg(node.args[0]);
        // First arg is optional, we must have 4 arguments
        if (hasOptionalArg && node.args.length !== 4) {
            return { label: undefined, description: undefined };
        }
        const labelNode = hasOptionalArg ? node.args[1] : node.args[0];
        const descriptionNode = hasOptionalArg ? node.args[3] : node.args[2];
        if (latex_utensils_1.latexParser.isGroup(descriptionNode)) {
            description = latex_utensils_1.latexParser.stringify(descriptionNode).slice(1, -1);
        }
        if (latex_utensils_1.latexParser.isGroup(labelNode)) {
            label = latex_utensils_1.latexParser.stringify(labelNode).slice(1, -1);
        }
        return { label, description };
    }
    /**
     * Parse the description from "short nodes" like \newglossaryentry
     *
     * Spec: \newglossaryentry{〈label〉}{〈key=value list〉}
     *
     * Example glossary entries:
     *     \newglossaryentry{lw}{name={LaTeX Workshop}, description={What this extension is}}
     *     \newglossaryentry{vscode}{name=VSCode, description=Editor}
     *
     * Note: descriptions can be single words or a {group of words}
     *
     * @param node the \newglossaryentry node from the parser
     * @returns the value of the description field
     */
    getShortNodeDescription(node) {
        let result;
        let description = undefined;
        let label = undefined;
        let lastNodeWasDescription = false;
        // We expect 2 arguments
        if (node.args.length !== 2) {
            return { label: undefined, description: undefined };
        }
        // Get label
        if (latex_utensils_1.latexParser.isGroup(node.args[0])) {
            label = latex_utensils_1.latexParser.stringify(node.args[0]).slice(1, -1);
        }
        // Get description
        if (latex_utensils_1.latexParser.isGroup(node.args[1])) {
            for (const subNode of node.args[1].content) {
                if (latex_utensils_1.latexParser.isTextString(subNode)) {
                    // Description is of the form description=single_word
                    if ((result = /description=(.*)/.exec(subNode.content)) !== null) {
                        if (result[1] !== '') {
                            description = result[1];
                            break;
                        }
                        lastNodeWasDescription = true;
                    }
                }
                else if (lastNodeWasDescription && latex_utensils_1.latexParser.isGroup(subNode)) {
                    // otherwise we have description={group of words}
                    description = latex_utensils_1.latexParser.stringify(subNode).slice(1, -1);
                    break;
                }
            }
        }
        return { label, description };
    }
    updateAll() {
        // Extract cached references
        const glossaryList = [];
        lw.cacher.getIncludedTeX().forEach(cachedFile => {
            const cachedGlossaries = lw.cacher.get(cachedFile)?.elements.glossary;
            if (cachedGlossaries === undefined) {
                return;
            }
            cachedGlossaries.forEach(ref => {
                if (ref.type === GlossaryType.glossary) {
                    this.glossaries.set(ref.label, ref);
                }
                else {
                    this.acronyms.set(ref.label, ref);
                }
                glossaryList.push(ref.label);
            });
        });
        // Remove references that has been deleted
        this.glossaries.forEach((_, key) => {
            if (!glossaryList.includes(key)) {
                this.glossaries.delete(key);
            }
        });
        this.acronyms.forEach((_, key) => {
            if (!glossaryList.includes(key)) {
                this.acronyms.delete(key);
            }
        });
    }
    /**
     * Update the Manager cache for references defined in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    update(file, nodes, content) {
        const cache = lw.cacher.get(file);
        if (cache === undefined) {
            return;
        }
        if (nodes !== undefined) {
            cache.elements.glossary = this.getGlossaryFromNodeArray(nodes, file);
        }
        else if (content !== undefined) {
            cache.elements.glossary = this.getGlossaryFromContent(content, file);
        }
    }
    getEntry(token) {
        this.updateAll();
        return this.glossaries.get(token) || this.acronyms.get(token);
    }
    getGlossaryFromContent(content, file) {
        const glossaries = [];
        const glossaryList = [];
        // We assume that the label is always result[1] and use getDescription(result) for the description
        const regexes = {
            'glossary': {
                regex: /\\(?:provide|new)glossaryentry{([^{}]*)}\s*{(?:(?!description).)*description=(?:([^{},]*)|{([^{}]*))[,}]/gms,
                type: GlossaryType.glossary,
                getDescription: (result) => { return result[2] ? result[2] : result[3]; }
            },
            'longGlossary': {
                regex: /\\long(?:provide|new)glossaryentry{([^{}]*)}\s*{[^{}]*}\s*{([^{}]*)}/gms,
                type: GlossaryType.glossary,
                getDescription: (result) => { return result[2]; }
            },
            'acronym': {
                regex: /\\newacronym(?:\[[^[\]]*\])?{([^{}]*)}{[^{}]*}{([^{}]*)}/gm,
                type: GlossaryType.acronym,
                getDescription: (result) => { return result[2]; }
            }
        };
        for (const key in regexes) {
            while (true) {
                const result = regexes[key].regex.exec(content);
                if (result === null) {
                    break;
                }
                const positionContent = content.substring(0, result.index).split('\n');
                if (glossaryList.includes(result[1])) {
                    continue;
                }
                glossaries.push({
                    type: regexes[key].type,
                    file,
                    position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length),
                    label: result[1],
                    detail: regexes[key].getDescription(result),
                    kind: vscode.CompletionItemKind.Reference
                });
            }
        }
        return glossaries;
    }
}
exports.Glossary = Glossary;
//# sourceMappingURL=glossary.js.map