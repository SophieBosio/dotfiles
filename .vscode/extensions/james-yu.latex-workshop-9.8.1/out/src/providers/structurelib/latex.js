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
exports.LaTeXStructure = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const latex_utensils_1 = require("latex-utensils");
const lw = __importStar(require("../../lw"));
const utils = __importStar(require("../../utils/utils"));
const section_1 = require("./section");
const utils_1 = require("../../utils/utils");
const inputfilepath_1 = require("../../utils/inputfilepath");
const logger_1 = require("../../components/logger");
const parser_1 = require("../../components/parser");
const logger = (0, logger_1.getLogger)('Structure', 'LaTeX');
class LaTeXStructure {
    /**
     * This function parses the AST tree of a LaTeX document to build its
     * structure. This is a two-step process. In the first step, all AST nodes
     * are traversed and filtered to build an array of sections that will appear
     * in the vscode view, but without any hierarchy. Then in the second step,
     * the hierarchy is constructed based on the config `view.outline.sections`.
     *
     * @param file The base file to start building the structure. If left
     * `undefined`, the current `rootFile` is used, i.e., build the structure
     * for the whole document/project.
     * @param subFile Whether subfiles should be included in the structure.
     * Default is `true`. If true, all input/subfile/subimport-like commands
     * will be parsed.
     * @param dirty Whether disk or dirty content should be used. Default is
     * `false`. When `subFile` is `true`, `dirty` should always be `false`.
     * @returns An array of {@link Section} to be shown in vscode view.
     */
    static async buildLaTeXModel(file, subFile = true, dirty = false) {
        dirty = dirty && !subFile;
        file = file ? file : lw.manager.rootFile;
        if (!file) {
            return [];
        }
        LaTeXStructure.refreshLaTeXModelConfig();
        // To avoid looping import, this variable is used to store file paths
        // that have been parsed.
        const filesBuilt = new Set();
        // Step 1: Create a flat array of sections.
        const flatNodes = await LaTeXStructure.buildLaTeXSectionFromFile(file, subFile, filesBuilt, dirty);
        // Normalize section depth. It's possible that there is no `chapter` in
        // a document. In such a case, `section` is the lowest level with a
        // depth 1. However, later logic is 0-based. So.
        LaTeXStructure.normalizeDepths(flatNodes);
        LaTeXStructure.buildFloatNumber(flatNodes, subFile);
        const { preambleFloats, flatSections } = LaTeXStructure.buildSectionNumber(flatNodes, subFile);
        // Step 2: Create the hierarchy of these sections.
        const preamble = LaTeXStructure.buildNestedFloats(preambleFloats, flatSections);
        const sections = LaTeXStructure.buildNestedSections(flatSections);
        const structure = [...preamble, ...sections];
        // Step 3: Determine the toLine of all sections.
        LaTeXStructure.buildLaTeXSectionToLine(structure, Number.MAX_SAFE_INTEGER);
        return structure;
    }
    /**
     * This function, different from {@link buildLaTeXModel}, focus on building
     * the structure of one particular file. Thus, recursive call is made upon
     * subfiles.
     *
     * @param file The LaTeX file whose AST is to be parsed.
     * @param subFile Whether the subfile-like commands should be considered.
     * @param filesBuilt The files that have already been parsed.
     * @returns A flat array of {@link Section} of this file.
     */
    static async buildLaTeXSectionFromFile(file, subFile, filesBuilt, dirty = false) {
        // Skip if the file has already been parsed. This is to avoid indefinite
        // loop under the case that A imports B and B imports back A.
        if (filesBuilt.has(file)) {
            return [];
        }
        filesBuilt.add(file);
        let content;
        let ast;
        if (dirty) {
            content = vscode.window.activeTextEditor?.document.getText();
            if (content) {
                const configuration = vscode.workspace.getConfiguration('latex-workshop');
                const fastparse = configuration.get('intellisense.fastparse.enabled');
                ast = await parser_1.parser.parseLatex(fastparse ? utils.stripText(content) : content).catch((e) => {
                    if (latex_utensils_1.latexParser.isSyntaxError(e)) {
                        const line = e.location.start.line;
                        logger.log(`Error parsing dirty AST of active editor at line ${line}. Fallback to cache.`);
                    }
                    return undefined;
                });
            }
        }
        if (!dirty || !content || !ast) {
            let waited = 0;
            while (!lw.cacher.promise(file) && !lw.cacher.has(file)) {
                // Just open vscode, has not cached, wait for a bit?
                await new Promise(resolve => setTimeout(resolve, 100));
                waited++;
                if (waited >= 20) {
                    // Waited for two seconds before starting cache. Really?
                    logger.log(`Error loading cache during structuring: ${file} .`);
                    return [];
                }
            }
            await lw.cacher.promise(file);
            content = lw.cacher.get(file)?.content;
            ast = lw.cacher.get(file)?.ast;
        }
        if (!content) {
            logger.log(`Error loading content during structuring: ${file} .`);
            return [];
        }
        if (!ast) {
            logger.log(`Error loading AST during structuring: ${file} .`);
            return [];
        }
        // Get a list of rnw child chunks
        const rnwChildren = subFile ? LaTeXStructure.parseRnwChildCommand(content, file, lw.manager.rootFile || '') : [];
        let rnwChild = rnwChildren.shift();
        // Parse each base-level node. If the node has contents, that function
        // will be called recursively.
        let sections = [];
        for (const node of ast.content) {
            while (rnwChild && node.location && rnwChild.line <= node.location.start.line) {
                sections = [
                    ...sections,
                    ...await LaTeXStructure.buildLaTeXSectionFromFile(rnwChild.subFile, subFile, filesBuilt, dirty)
                ];
                rnwChild = rnwChildren.shift();
            }
            sections = [
                ...sections,
                ...await LaTeXStructure.parseLaTeXNode(node, file, subFile, filesBuilt)
            ];
        }
        return sections;
    }
    /**
     * This function parses a particular LaTeX AST node and its sub-nodes
     * (contents by `latex-utensils`).
     *
     * @param node The AST node to be parsed.
     *
     * All other parameters are identical to {@link buildLaTeXSectionFromFile}.
     *
     * @returns A flat array of {@link Section} of this node.
     */
    static async parseLaTeXNode(node, file, subFile, filesBuilt) {
        let sections = [];
        if (latex_utensils_1.latexParser.isCommand(node)) {
            if (LaTeXStructure.LaTeXCommands.secs.includes(node.name.replace(/\*$/, ''))) {
                // \section{Title}
                if (node.args.length > 0) {
                    // Avoid \section alone
                    const captionArg = node.args.find(latex_utensils_1.latexParser.isGroup);
                    if (captionArg) {
                        sections.push(new section_1.Section(node.name.endsWith('*') ? section_1.SectionKind.NoNumberSection : section_1.SectionKind.Section, LaTeXStructure.captionify(captionArg), vscode.TreeItemCollapsibleState.Expanded, LaTeXStructure.LaTeXSectionDepths[node.name.replace(/\*$/, '')], node.location.start.line - 1, node.location.end.line - 1, file));
                    }
                }
            }
            else if (LaTeXStructure.LaTeXCommands.cmds.includes(node.name.replace(/\*$/, ''))) {
                // \notlabel{Show}{ShowAlso}
                // const caption = node.args.map(arg => {
                // const argContent = latexParser.stringify(arg)
                //     return argContent.slice(1, argContent.length - 1)
                // }).join(', ') // -> Show, ShowAlso
                let caption = '';
                const captionArg = node.args.find(latex_utensils_1.latexParser.isGroup);
                if (captionArg) {
                    caption = latex_utensils_1.latexParser.stringify(captionArg);
                    caption = caption.slice(1, caption.length - 1);
                }
                sections.push(new section_1.Section(section_1.SectionKind.Label, `#${node.name}: ${caption}`, vscode.TreeItemCollapsibleState.Expanded, -1, node.location.start.line - 1, node.location.end.line - 1, file));
            }
            else if (subFile) {
                // Check if this command is a subfile one
                sections = [
                    ...sections,
                    ...await LaTeXStructure.parseLaTeXSubFileCommand(node, file, filesBuilt)
                ];
            }
        }
        else if (latex_utensils_1.latexParser.isLabelCommand(node) && LaTeXStructure.LaTeXCommands.cmds.includes(node.name)) {
            // \label{this:is_a-label}
            sections.push(new section_1.Section(section_1.SectionKind.Label, `#${node.name}: ${node.label}`, // -> #this:is_a-label
            vscode.TreeItemCollapsibleState.Expanded, -1, node.location.start.line - 1, node.location.end.line - 1, file));
        }
        else if (latex_utensils_1.latexParser.isEnvironment(node) && LaTeXStructure.LaTeXCommands.envs.includes(node.name.replace(/\*$/, ''))) {
            // \begin{figure}...\end{figure}
            const caption = LaTeXStructure.findEnvCaption(node);
            sections.push(new section_1.Section(section_1.SectionKind.Env, 
            // -> Figure: Caption of figure
            node.name.charAt(0).toUpperCase() + node.name.slice(1) + (caption ? `: ${caption}` : ''), vscode.TreeItemCollapsibleState.Expanded, -1, node.location.start.line - 1, node.location.end.line - 1, file));
        }
        if (latex_utensils_1.latexParser.hasContentArray(node)) {
            for (const subNode of node.content) {
                sections = [
                    ...sections,
                    ...await LaTeXStructure.parseLaTeXNode(subNode, file, subFile, filesBuilt)
                ];
            }
        }
        return sections;
    }
    /**
     * This function parses a particular LaTeX AST command to see if it is a
     * sub-file-like one. If so, the flat section array of the sub-file is
     * parsed using {@link buildLaTeXSectionFromFile} and returned.
     *
     * @param node The AST command to be parsed.
     *
     * All other parameters are identical to {@link buildLaTeXSectionFromFile}.
     *
     * @returns A flat array of {@link Section} of this sub-file, or an empty
     * array if the command is not a sub-file-like.
     */
    static async parseLaTeXSubFileCommand(node, file, filesBuilt) {
        const cmdArgs = [];
        node.args.forEach((arg) => {
            if (latex_utensils_1.latexParser.isOptionalArg(arg)) {
                return;
            }
            const argString = latex_utensils_1.latexParser.stringify(arg);
            cmdArgs.push(argString.slice(1, argString.length - 1));
        });
        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs');
        let candidate;
        // \input{sub.tex}
        if (['input', 'InputIfFileExists', 'include', 'SweaveInput',
            'subfile', 'loadglsentries'].includes(node.name.replace(/\*$/, ''))
            && cmdArgs.length > 0) {
            candidate = (0, utils_1.resolveFile)([path.dirname(file),
                path.dirname(lw.manager.rootFile || ''),
                ...texDirs], cmdArgs[0]);
        }
        // \import{sections/}{section1.tex}
        if (['import', 'inputfrom', 'includefrom'].includes(node.name.replace(/\*$/, ''))
            && cmdArgs.length > 1) {
            candidate = (0, utils_1.resolveFile)([cmdArgs[0],
                path.join(path.dirname(lw.manager.rootFile || ''), cmdArgs[0])], cmdArgs[1]);
        }
        // \subimport{01-IntroDir/}{01-Intro.tex}
        if (['subimport', 'subinputfrom', 'subincludefrom'].includes(node.name.replace(/\*$/, ''))
            && cmdArgs.length > 1) {
            candidate = (0, utils_1.resolveFile)([path.dirname(file)], path.join(cmdArgs[0], cmdArgs[1]));
        }
        return candidate ? LaTeXStructure.buildLaTeXSectionFromFile(candidate, true, filesBuilt) : [];
    }
    /**
     * This function tries to figure the caption of a `frame`, `figure`, or
     * `table` using their respective syntax.
     *
     * @param node The environment node to be parsed
     * @returns The caption found, or empty.
     */
    static findEnvCaption(node) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (!configuration.get('view.outline.floats.caption.enabled')) {
            return '';
        }
        let captionNode;
        let caption = '';
        if (node.name.replace(/\*$/, '') === 'frame') {
            // Frame titles can be specified as either \begin{frame}{Frame Title}
            // or \begin{frame} \frametitle{Frame Title}
            // \begin{frame}(whitespace){Title} will set the title as long as the whitespace contains no more than 1 newline
            captionNode = node.content.filter(latex_utensils_1.latexParser.isCommand).find(subNode => subNode.name.replace(/\*$/, '') === 'frametitle');
            // \begin{frame}(whitespace){Title}
            const nodeArg = node.args.find(latex_utensils_1.latexParser.isGroup);
            caption = nodeArg ? LaTeXStructure.captionify(nodeArg) : caption;
        }
        else if (['figure', 'table'].includes(node.name.replace(/\*$/, ''))) {
            // \begin{figure} \caption{Figure Title}
            captionNode = node.content.filter(latex_utensils_1.latexParser.isCommand).find(subNode => subNode.name.replace(/\*$/, '') === 'caption');
        }
        else if (['macro', 'environment'].includes(node.name.replace(/\*$/, ''))) {
            // DocTeX: \begin{macro}{<macro>}
            const nodeArg = node.args.find(latex_utensils_1.latexParser.isGroup);
            caption = nodeArg ? LaTeXStructure.captionify(nodeArg) : caption;
        }
        // \frametitle can override title set in \begin{frame}{<title>}
        // \frametitle{Frame Title} or \caption{Figure Title}
        if (captionNode) {
            const arg = captionNode.args.find(latex_utensils_1.latexParser.isGroup);
            caption = arg ? LaTeXStructure.captionify(arg) : caption;
        }
        return caption;
    }
    static captionify(argNode) {
        for (let index = 0; index < argNode.content.length; ++index) {
            const node = argNode.content[index];
            if (latex_utensils_1.latexParser.isCommand(node)
                && node.name === 'texorpdfstring'
                && node.args.length === 2) {
                const pdfString = latex_utensils_1.latexParser.stringify(node.args[1]);
                const firstArg = node.args[1].content[0];
                if (latex_utensils_1.latexParser.isTextString(firstArg)) {
                    firstArg.content = pdfString.slice(1, pdfString.length - 1);
                    argNode.content[index] = firstArg;
                }
            }
        }
        const caption = latex_utensils_1.latexParser.stringify(argNode).replace(/\n/g, ' ');
        return caption.slice(1, caption.length - 1); // {Title} -> Title
    }
    static buildFloatNumber(flatNodes, subFile) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (!configuration.get('view.outline.floats.number.enabled' || !subFile)) {
            return;
        }
        if (flatNodes.length === 0) {
            return;
        }
        const counter = {};
        flatNodes.forEach(section => {
            if (section.kind !== section_1.SectionKind.Env) {
                return;
            }
            if (section.label.toLowerCase().startsWith('macro') || section.label.toLowerCase().startsWith('environment')) {
                // DocTeX
                return;
            }
            const labelSegments = section.label.split(':');
            counter[labelSegments[0]] = counter[labelSegments[0]] ? counter[labelSegments[0]] + 1 : 1;
            labelSegments[0] = `${labelSegments[0]} ${counter[labelSegments[0]]}`;
            section.label = labelSegments.join(':');
        });
    }
    static normalizeDepths(flatNodes) {
        let lowest = 65535;
        flatNodes.filter(node => node.depth > -1).forEach(section => {
            lowest = lowest < section.depth ? lowest : section.depth;
        });
        flatNodes.filter(node => node.depth > -1).forEach(section => {
            section.depth -= lowest;
        });
    }
    /**
     * Build the number of sections. Also put all non-sections into their
     * leading section. This is to make the subsequent logic clearer.
     */
    static buildSectionNumber(flatNodes, subFile) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const sectionNumber = subFile && configuration.get('view.outline.numbers.enabled');
        // All non-section nodes before the first section
        const preambleFloats = [];
        // Only holds section-like Sections
        const flatSections = [];
        // This counter is used to calculate the section numbers. The array
        // holds the current numbering. When developing the numbers, just +1 to
        // the appropriate item and retrieve the sub-array.
        let counter = [];
        flatNodes.forEach(node => {
            if (node.depth === -1) {
                // non-section node
                if (flatSections.length === 0) {
                    // no section appeared yet
                    preambleFloats.push(node);
                }
                else {
                    flatSections[flatSections.length - 1].children.push(node);
                }
            }
            else {
                if (sectionNumber && node.kind === section_1.SectionKind.Section) {
                    const depth = node.depth;
                    if (depth + 1 > counter.length) {
                        counter = [...counter, ...new Array(depth + 1 - counter.length).fill(0)];
                    }
                    else {
                        counter = counter.slice(0, depth + 1);
                    }
                    counter[counter.length - 1] += 1;
                    node.label = `${counter.join('.')} ${node.label}`;
                }
                else if (sectionNumber && node.kind === section_1.SectionKind.NoNumberSection) {
                    node.label = `* ${node.label}`;
                }
                flatSections.push(node);
            }
        });
        return { preambleFloats, flatSections };
    }
    static buildNestedFloats(preambleFloats, flatSections) {
        const findChild = (parentNode, childNode) => {
            if (childNode.lineNumber >= parentNode.lineNumber && childNode.toLine <= parentNode.toLine) {
                let added = false;
                for (let index = 0; index < parentNode.children.length; index++) {
                    const parentCandidate = parentNode.children[index];
                    if (findChild(parentCandidate, childNode)) {
                        added = true;
                        break;
                    }
                }
                if (!added) {
                    parentNode.children.push(childNode);
                }
                return true;
            }
            return false;
        };
        // Non-sections may also be nested.
        const preamble = preambleFloats[0] ? [preambleFloats[0]] : [];
        for (let index = 1; index < preambleFloats.length; index++) {
            if (!findChild(preamble[preamble.length - 1], preambleFloats[index])) {
                preamble.push(preambleFloats[index]);
            }
        }
        flatSections.forEach(section => {
            const children = [section.children[0]];
            for (let index = 1; index < section.children.length; index++) {
                findChild(children[children.length - 1], section.children[index]);
            }
        });
        return preamble;
    }
    /**
     * This function builds the hierarchy of a flat {@link Section} array
     * according to the input hierarchy data. This is a two-step process. The
     * first step puts all non-section {@link Section}s into their leading
     * section {@link Section}. The section numbers are also optionally added in
     * this step. Then in the second step, the section {@link Section}s are
     * iterated to build the hierarchy.
     *
     * @param flatStructure The flat sections whose hierarchy is to be built.
     * @param showHierarchyNumber Whether the section numbers should be computed
     * and prepended to section captions.
     * @returns The final sections to be shown with hierarchy.
     */
    static buildNestedSections(flatSections) {
        const sections = [];
        flatSections.forEach(section => {
            if (section.depth === 0) {
                // base level section
                sections.push(section);
            }
            else if (sections.length === 0) {
                // non-base level section, no previous sections available, create one
                sections.push(section);
            }
            else {
                // Starting from the last base-level section, find out the
                // proper level.
                let currentSection = sections[sections.length - 1];
                while (currentSection.depth < section.depth - 1) {
                    const children = currentSection.children.filter(candidate => candidate.depth > -1);
                    if (children.length > 0) {
                        // If there is a section child
                        currentSection = children[children.length - 1];
                    }
                    else {
                        // If there is a jump e.g., section -> subsubsection,
                        // give up finding.
                        break;
                    }
                }
                currentSection.children.push(section);
            }
        });
        return sections;
    }
    static buildLaTeXSectionToLine(structure, lastLine) {
        const sections = structure.filter(section => section.depth >= 0);
        sections.forEach(section => {
            const sameFileSections = sections.filter(candidate => (candidate.fileName === section.fileName) &&
                (candidate.lineNumber >= section.lineNumber) &&
                (candidate !== section));
            if (sameFileSections.length > 0 && sameFileSections[0].lineNumber === section.lineNumber) {
                // On the same line, e.g., \section{one}\section{two}
                return;
            }
            else if (sameFileSections.length > 0) {
                section.toLine = sameFileSections[0].lineNumber - 1;
            }
            else {
                section.toLine = lastLine;
            }
            if (section.children.length > 0) {
                LaTeXStructure.buildLaTeXSectionToLine(section.children, section.toLine);
            }
        });
    }
    static parseRnwChildCommand(content, file, rootFile) {
        const children = [];
        const childRegExp = new inputfilepath_1.InputFileRegExp();
        while (true) {
            const result = childRegExp.execChild(content, file, rootFile);
            if (!result) {
                break;
            }
            const line = (content.slice(0, result.match.index).match(/\n/g) || []).length;
            children.push({ subFile: result.path, line });
        }
        return children;
    }
    static refreshLaTeXModelConfig(defaultFloats = ['frame']) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const cmds = configuration.get('view.outline.commands');
        const envs = configuration.get('view.outline.floats.enabled') ? ['figure', 'table', ...defaultFloats] : defaultFloats;
        const hierarchy = configuration.get('view.outline.sections');
        hierarchy.forEach((sec, index) => {
            sec.split('|').forEach(cmd => {
                LaTeXStructure.LaTeXSectionDepths[cmd] = index;
            });
        });
        LaTeXStructure.LaTeXCommands = { cmds, envs, secs: hierarchy.map(sec => sec.split('|')).flat() };
    }
}
exports.LaTeXStructure = LaTeXStructure;
// The LaTeX commands to be extracted.
LaTeXStructure.LaTeXCommands = { cmds: [], envs: [], secs: [] };
// The correspondance of section types and depths. Start from zero is
// the top-most section (e.g., chapter). -1 is reserved for non-section
// commands.
LaTeXStructure.LaTeXSectionDepths = {};
//# sourceMappingURL=latex.js.map