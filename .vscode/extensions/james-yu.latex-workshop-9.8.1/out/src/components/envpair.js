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
exports.EnvPair = void 0;
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("../lw"));
const logger_1 = require("./logger");
const parser_1 = require("./parser");
const latex_utensils_1 = require("latex-utensils");
const logger = (0, logger_1.getLogger)('EnvPair');
var PairType;
(function (PairType) {
    PairType[PairType["ENVIRONMENT"] = 0] = "ENVIRONMENT";
    PairType[PairType["DISPLAYMATH"] = 1] = "DISPLAYMATH";
    PairType[PairType["INLINEMATH"] = 2] = "INLINEMATH";
    PairType[PairType["COMMAND"] = 3] = "COMMAND";
})(PairType || (PairType = {}));
class CommandPair {
    constructor(type, 
    /** The opening string. It contains the leading slash */
    start, 
    /** The starting position of `start` */
    startPosition, 
    /** The closing string. It contains the leading slash */
    end, 
    /** The ending position of `end` */
    endPosition) {
        this.type = type;
        this.start = start;
        this.startPosition = startPosition;
        this.end = end;
        this.endPosition = endPosition;
        /** The list of contained pairs */
        this.children = [];
        /** The parent of top-level pairs must be undefined */
        this.parent = undefined;
    }
    /**
     * Does the start statement contain `pos`
     */
    startContains(pos) {
        const startRange = new vscode.Range(this.startPosition, this.startPosition.translate(0, this.start.length));
        return startRange.contains(pos);
    }
    /**
     * Does the end statement contain `pos`
     */
    endContains(pos) {
        if (this.end && this.endPosition) {
            const endRange = new vscode.Range(this.endPosition, this.endPosition.translate(0, -this.end.length));
            return endRange.contains(pos);
        }
        return false;
    }
}
class EnvPair {
    constructor() { }
    async buildCommandPairTree(doc) {
        let ast = await parser_1.parser.parseLatex(doc.getText()).catch((e) => {
            if (latex_utensils_1.latexParser.isSyntaxError(e)) {
                const line = e.location.start.line;
                logger.log(`Error parsing dirty AST of active editor at line ${line}. Fallback to cache.`);
            }
            return undefined;
        });
        if (!ast) {
            await lw.cacher.promise(doc.fileName);
            ast = lw.cacher.get(doc.fileName)?.ast;
        }
        if (!ast) {
            logger.log(`Error loading AST during structuring: ${doc.fileName} .`);
            return [];
        }
        const commandPairs = [];
        let parentPair = undefined;
        for (const node of ast.content) {
            parentPair = this.buildCommandPairTreeFromNode(node, parentPair, commandPairs);
        }
        return commandPairs;
    }
    buildCommandPairTreeFromNode(node, parentCommandPair, commandPairs) {
        if (latex_utensils_1.latexParser.isEnvironment(node) || latex_utensils_1.latexParser.isMathEnv(node) || latex_utensils_1.latexParser.isMathEnvAligned(node)) {
            const name = node.name;
            let currentCommandPair;
            // If we encounter `\begin{document}`, clear commandPairs
            if (name === 'document') {
                commandPairs.length = 0;
                currentCommandPair = undefined;
                parentCommandPair = undefined;
            }
            else {
                const beginName = `\\begin{${name}}`;
                const endName = `\\end{${name}}`;
                const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1);
                const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1);
                currentCommandPair = new CommandPair(PairType.ENVIRONMENT, beginName, beginPos, endName, endPos);
                if (parentCommandPair) {
                    currentCommandPair.parent = parentCommandPair;
                    parentCommandPair.children.push(currentCommandPair);
                }
                else {
                    commandPairs.push(currentCommandPair);
                }
                parentCommandPair = currentCommandPair;
            }
            for (const subnode of node.content) {
                parentCommandPair = this.buildCommandPairTreeFromNode(subnode, parentCommandPair, commandPairs);
            }
            parentCommandPair = currentCommandPair?.parent;
        }
        else if (latex_utensils_1.latexParser.isDisplayMath(node)) {
            const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1);
            const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1);
            const currentCommandPair = new CommandPair(PairType.DISPLAYMATH, '\\[', beginPos, '\\]', endPos);
            commandPairs.push(currentCommandPair);
        }
        else if (latex_utensils_1.latexParser.isInlienMath(node)) {
            const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1);
            const endPos = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1);
            const currentCommandPair = new CommandPair(PairType.INLINEMATH, '\\(', beginPos, '\\)', endPos);
            commandPairs.push(currentCommandPair);
        }
        else if (latex_utensils_1.latexParser.isCommand(node)) {
            if (node.name === 'begin' && node.args.length > 0 && latex_utensils_1.latexParser.isGroup(node.args[0])) {
                // This is an unbalanced environment
                const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1);
                const envName = latex_utensils_1.latexParser.stringify(node.args[0]).slice(1, -1);
                const name = `\\begin{${envName}}`;
                const currentCommandPair = new CommandPair(PairType.ENVIRONMENT, name, beginPos);
                if (parentCommandPair) {
                    currentCommandPair.parent = parentCommandPair;
                    parentCommandPair.children.push(currentCommandPair);
                }
                else {
                    commandPairs.push(currentCommandPair);
                }
                // currentCommandPair becomes the new parent
                return currentCommandPair;
            }
            const name = '\\' + node.name;
            for (const pair of EnvPair.delimiters) {
                if (pair.type === PairType.COMMAND && name.match(pair.end) && parentCommandPair && parentCommandPair.start.match(pair.start)) {
                    parentCommandPair.end = name;
                    parentCommandPair.endPosition = new vscode.Position(node.location.end.line - 1, node.location.end.column - 1);
                    parentCommandPair = parentCommandPair.parent;
                    // Do not return after finding an 'end' token as it can also be the start of an other pair.
                }
            }
            for (const pair of EnvPair.delimiters) {
                if (pair.type === PairType.COMMAND && name.match(pair.start)) {
                    const beginPos = new vscode.Position(node.location.start.line - 1, node.location.start.column - 1);
                    const currentCommandPair = new CommandPair(PairType.COMMAND, name, beginPos);
                    if (parentCommandPair) {
                        currentCommandPair.parent = parentCommandPair;
                        parentCommandPair.children.push(currentCommandPair);
                    }
                    else {
                        commandPairs.push(currentCommandPair);
                    }
                    // currentCommandPair becomes the new parent
                    return currentCommandPair;
                }
            }
        }
        return parentCommandPair;
    }
    /**
     * Find all pairs surrounding the current position
     *
     * @param pos starting position (e.g. cursor position)
     * @param doc the document in which the search is performed
     */
    async locateSurroundingPair(pos, doc) {
        const commandPairTree = await this.buildCommandPairTree(doc);
        const matchedCommandPairs = this.walkThruForSurroundingPairs(pos, commandPairTree);
        return matchedCommandPairs;
    }
    walkThruForSurroundingPairs(pos, commandPairTree) {
        const surroundingPairs = [];
        for (const commandPair of commandPairTree) {
            if (commandPair.startPosition.isBeforeOrEqual(pos)) {
                if (!commandPair.endPosition || commandPair.endPosition.isAfter(pos)) {
                    surroundingPairs.push(commandPair);
                    if (commandPair.children) {
                        surroundingPairs.push(...this.walkThruForSurroundingPairs(pos, commandPair.children));
                    }
                }
            }
        }
        return surroundingPairs;
    }
    /**
     * Return all the pairs at the same depth as the pair containing `pos`
     *
     * @param pos current cursor position
     * @param doc current document
     * @returns CommandPair[]
     */
    async locatePairsAtDepth(pos, doc) {
        const commandPairTree = await this.buildCommandPairTree(doc);
        const overlappingPairs = this.walkThruForPairsNextToPosition(pos, commandPairTree);
        return overlappingPairs;
    }
    walkThruForPairsNextToPosition(pos, commandPairTree) {
        const pairsAtPosition = [];
        if (commandPairTree.some((pair) => pair.startContains(pos) || pair.endContains(pos))) {
            return commandPairTree;
        }
        for (const commandPair of commandPairTree) {
            if (commandPair.startPosition.isBefore(pos)) {
                if (!commandPair.endPosition || commandPair.endPosition.isAfter(pos)) {
                    if (commandPair.children) {
                        pairsAtPosition.push(...this.walkThruForPairsNextToPosition(pos, commandPair.children));
                    }
                }
            }
        }
        return pairsAtPosition;
    }
    /**
     * If we are on a starting statement, go to the matching end statement
     * If we are on end statement, go to the opening statement of the first pair making a contiguous chain of pairs up to the curent position.
     *
     * Consider the following LaTeX content
     *
     *  \ifpoo
     *      ....
     *  \else
     *      ...
     *  \fi
     *
     * Calling this function yields the following move
     *  \ifpoo -> \else
     *  \else -> \fi
     *  \fi -> \ifpoo
     */
    async gotoPair() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'latex') {
            return;
        }
        const curPos = editor.selection.active;
        const document = editor.document;
        const pairs = (await this.locatePairsAtDepth(curPos, document));
        // First, test if we are an opening statement.
        for (const pair of pairs) {
            if (pair.startContains(curPos) && pair.endPosition && pair.end) {
                const endStartPosition = pair.endPosition.translate(0, -pair.end.length);
                editor.selection = new vscode.Selection(endStartPosition, endStartPosition);
                return;
            }
        }
        // Second, if we are not on an opening statement, test if we are on a closing one.
        for (const [index, pair] of pairs.entries()) {
            if (pair.endContains(curPos)) {
                editor.selection = new vscode.Selection(pair.startPosition, pair.startPosition);
                const contiguousPairs = [pair];
                let currentPos = pair.startPosition;
                // Locate the chain of contiguous pairs up to here
                for (const previousPair of pairs.slice(undefined, index).reverse()) {
                    if (previousPair.endContains(currentPos)) {
                        currentPos = previousPair.startPosition;
                        contiguousPairs.push(previousPair);
                    }
                    else {
                        break;
                    }
                }
                const firstPair = contiguousPairs.pop();
                editor.selection = new vscode.Selection(firstPair.startPosition, firstPair.startPosition);
                return;
            }
        }
    }
    /**
     * Select or add a multi-cursor to an environment name if called with
     * `action = 'selection'` or `action = 'cursor'` respectively.
     *
     * Toggles between `\[...\]` and `\begin{$text}...\end{$text}`
     * where `$text` is `''` if `action = cursor` and `'equation*'` otherwise
     *
     * Only toggles if `action = equationToggle` (i.e. does not move selection)
     *
     * @param action  can be
     *      - 'selection': the environment name is selected both in the begin and end part
     *      - 'cursor': a multi-cursor is added at the beginning of the environment name is selected both in the begin and end part
     *      - 'equationToggle': toggles between `\[...\]` and `\begin{}...\end{}`
     */
    async envNameAction(action) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'latex') {
            return;
        }
        let startingPos = editor.selection.active;
        const document = editor.document;
        // Only keep display math and environments
        const matchedPairs = (await this.locateSurroundingPair(startingPos, document)).filter((pair) => {
            return pair.end && pair.endPosition && [PairType.DISPLAYMATH, PairType.ENVIRONMENT].includes(pair.type);
        });
        const matchedPair = matchedPairs.at(-1);
        if (!matchedPair?.end || !matchedPair?.endPosition) {
            logger.log('No matched command pair found in envNameAction');
            return;
        }
        const beginEnvStartPos = matchedPair.startPosition.translate(0, '\\begin{'.length);
        let endEnvStartPos = matchedPair.endPosition.translate(0, -matchedPair.end.length + '\\end{'.length);
        const edit = new vscode.WorkspaceEdit();
        let envNameLength;
        if (matchedPair.type === PairType.DISPLAYMATH) {
            const eqText = action === 'cursor' ? '' : 'equation*';
            const beginRange = new vscode.Range(matchedPair.startPosition, matchedPair.startPosition.translate(0, 2)); // 2 = '\\['.length
            const endRange = new vscode.Range(matchedPair.endPosition.translate(0, -2), matchedPair.endPosition); // 2 = '\\]'.length
            envNameLength = eqText.length;
            edit.replace(document.uri, endRange, `\\end{${eqText}}`);
            edit.replace(document.uri, beginRange, `\\begin{${eqText}}`);
            const diff = 'begin{}'.length + envNameLength - '['.length;
            if (startingPos.line === matchedPair.startPosition.line) {
                startingPos = startingPos.translate(0, diff);
            }
            if (matchedPair.startPosition.line === matchedPair.endPosition.line) {
                endEnvStartPos = endEnvStartPos.translate(0, diff);
            }
        }
        else if (matchedPair.type === PairType.ENVIRONMENT) {
            if (action === 'equationToggle') {
                const beginRange = new vscode.Range(matchedPair.startPosition, matchedPair.startPosition.translate(0, matchedPair.start.length));
                const endRange = new vscode.Range(matchedPair.endPosition.translate(0, -matchedPair.end.length), matchedPair.endPosition);
                edit.replace(document.uri, endRange, '\\]');
                edit.replace(document.uri, beginRange, '\\[');
                if (startingPos.line === matchedPair.startPosition.line) {
                    const diff = Math.max('['.length - matchedPair.start.length, -startingPos.character);
                    startingPos = startingPos.translate(0, diff);
                }
            }
            else {
                envNameLength = matchedPair.start.length - '\\begin{}'.length;
            }
        }
        else {
            // Bad match
            return;
        }
        void vscode.workspace.applyEdit(edit).then(success => {
            if (success || edit.size === 0) {
                switch (action) {
                    case 'cursor':
                        editor.selections = [new vscode.Selection(beginEnvStartPos, beginEnvStartPos), new vscode.Selection(endEnvStartPos, endEnvStartPos)];
                        break;
                    case 'selection': {
                        const beginEnvStopPos = beginEnvStartPos.translate(0, envNameLength);
                        const endEnvStopPos = endEnvStartPos.translate(0, envNameLength);
                        editor.selections = [new vscode.Selection(beginEnvStartPos, beginEnvStopPos), new vscode.Selection(endEnvStartPos, endEnvStopPos)];
                        break;
                    }
                    case 'equationToggle':
                        editor.selection = new vscode.Selection(startingPos, startingPos);
                        break;
                    default:
                        logger.log('Error while selecting environment name');
                }
            }
        });
    }
    async selectEnvContent(mode) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'latex') {
            return;
        }
        const startingPos = editor.selection.active;
        const document = editor.document;
        const matchedCommandPairs = await this.locateSurroundingPair(startingPos, document);
        for (const pair of matchedCommandPairs.reverse()) {
            if (pair.endPosition && pair.end) {
                let startEnvPos;
                let endEnvPos;
                if (mode === 'content') {
                    startEnvPos = pair.startPosition.translate(0, pair.start.length + 1);
                    endEnvPos = pair.endPosition.translate(0, -pair.end.length);
                }
                else if (mode === 'whole') {
                    startEnvPos = pair.startPosition;
                    endEnvPos = pair.endPosition;
                }
                else {
                    return;
                }
                editor.selections = [new vscode.Selection(startEnvPos, endEnvPos)];
                if (editor.selections[0].contains(startingPos)) {
                    return;
                }
            }
        }
    }
    async closeEnv() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'latex') {
            return;
        }
        const cursorPos = editor.selection.active;
        const document = editor.document;
        const matchedPairs = (await this.locateSurroundingPair(cursorPos, document)).filter((pair) => { return !pair.endPosition; });
        const matchedPair = matchedPairs.at(-1);
        if (!matchedPair) {
            logger.log('No matched command pair found in envNameAction');
            return;
        }
        const beginStartOfLine = matchedPair.startPosition.with(undefined, 0);
        const beginIndentRange = new vscode.Range(beginStartOfLine, matchedPair.startPosition);
        const beginIndent = editor.document.getText(beginIndentRange);
        const endStartOfLine = cursorPos.with(undefined, 0);
        const endIndentRange = new vscode.Range(endStartOfLine, cursorPos);
        const endIndent = editor.document.getText(endIndentRange);
        // If both \begin and the current position are preceded by
        // whitespace only in their respective lines, we mimic the exact
        // kind of indentation of \begin when inserting \end.
        const endEnv = matchedPair.start.replace('\\begin', '\\end');
        if (/^\s*$/.test(beginIndent) && /^\s*$/.test(endIndent)) {
            return editor.edit(editBuilder => {
                editBuilder.replace(new vscode.Range(endStartOfLine, cursorPos), beginIndent + endEnv);
            });
        }
        else {
            return editor.edit(editBuilder => { editBuilder.insert(cursorPos, endEnv); });
        }
    }
}
exports.EnvPair = EnvPair;
EnvPair.delimiters = [
    { type: PairType.ENVIRONMENT, start: /\\begin\{([\w\d]+\*?)\}/, end: /\\end\{([\w\d]+\*?)/ },
    { type: PairType.INLINEMATH, start: /\\\(/, end: /\\\)/ },
    { type: PairType.DISPLAYMATH, start: /\\\[/, end: /\\\]/ },
    { type: PairType.COMMAND, start: /\\if\w*/, end: /\\fi/ },
    { type: PairType.COMMAND, start: /\\if\w*/, end: /\\else/ },
    { type: PairType.COMMAND, start: /\\else/, end: /\\fi/ }
];
//# sourceMappingURL=envpair.js.map