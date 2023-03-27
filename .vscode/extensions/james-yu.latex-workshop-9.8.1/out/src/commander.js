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
exports.toggleMathPreviewPanel = exports.closeMathPreviewPanel = exports.openMathPreviewPanel = exports.saveActive = exports.texdocUsepackages = exports.texdoc = exports.devParseBib = exports.devParseTeX = exports.devParseLog = exports.selectSection = exports.shiftSectioningLevel = exports.toggleSelectedKeyword = exports.onEnterKey = exports.insertSnippet = exports.actions = exports.resetHostName = exports.changeHostName = exports.closeEnv = exports.toggleEquationEnv = exports.multiCursorEnvName = exports.selectEnvName = exports.selectEnvContent = exports.navigateToEnvPair = exports.gotoSection = exports.showLog = exports.wordcount = exports.citation = exports.addTexRoot = exports.clean = exports.synctexonref = exports.synctex = exports.kill = exports.refresh = exports.view = exports.recipes = exports.revealOutputDir = exports.build = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const lw = __importStar(require("./lw"));
const utils_1 = require("./utils/utils");
const logger_1 = require("./components/logger");
const parser_1 = require("./components/parser");
const logger = (0, logger_1.getLogger)('Commander');
async function build(skipSelection = false, rootFile = undefined, languageId = undefined, recipe = undefined) {
    logger.log('BUILD command invoked.');
    if (!vscode.window.activeTextEditor) {
        logger.log('Cannot start to build because the active editor is undefined.');
        return;
    }
    logger.log(`The document of the active editor: ${vscode.window.activeTextEditor.document.uri.toString(true)}`);
    logger.log(`The languageId of the document: ${vscode.window.activeTextEditor.document.languageId}`);
    const workspace = rootFile ? vscode.Uri.file(rootFile) : vscode.window.activeTextEditor.document.uri;
    const configuration = vscode.workspace.getConfiguration('latex-workshop', workspace);
    const externalBuildCommand = configuration.get('latex.external.build.command');
    const externalBuildArgs = configuration.get('latex.external.build.args');
    if (rootFile === undefined && lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        rootFile = await lw.manager.findRoot();
        languageId = lw.manager.rootFileLanguageId;
    }
    if (externalBuildCommand) {
        const pwd = path.dirname(rootFile ? rootFile : vscode.window.activeTextEditor.document.fileName);
        await lw.builder.buildExternal(externalBuildCommand, externalBuildArgs, pwd, rootFile);
        return;
    }
    if (rootFile === undefined || languageId === undefined) {
        logger.log('Cannot find LaTeX root file. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#the-root-file');
        return;
    }
    let pickedRootFile = rootFile;
    if (!skipSelection && lw.manager.localRootFile) {
        // We are using the subfile package
        pickedRootFile = await quickPickRootFile(rootFile, lw.manager.localRootFile, 'build');
        if (!pickedRootFile) {
            return;
        }
    }
    logger.log(`Building root file: ${pickedRootFile}`);
    await lw.builder.build(pickedRootFile, languageId, recipe);
}
exports.build = build;
async function revealOutputDir() {
    let outDir = lw.manager.getOutDir();
    if (!path.isAbsolute(outDir)) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const rootDir = lw.manager.rootDir || workspaceFolder?.uri.fsPath;
        if (rootDir === undefined) {
            logger.log(`Cannot reveal ${vscode.Uri.file(outDir)}: no root dir can be identified.`);
            return;
        }
        outDir = path.resolve(rootDir, outDir);
    }
    logger.log(`Reveal ${vscode.Uri.file(outDir)}`);
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outDir));
}
exports.revealOutputDir = revealOutputDir;
function recipes(recipe) {
    logger.log('RECIPES command invoked.');
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.manager.getWorkspaceFolderRootDir());
    const candidates = configuration.get('latex.recipes');
    if (!candidates) {
        return;
    }
    if (recipe) {
        return build(false, undefined, undefined, recipe);
    }
    return vscode.window.showQuickPick(candidates.map(candidate => candidate.name), {
        placeHolder: 'Please Select a LaTeX Recipe'
    }).then(selected => {
        if (!selected) {
            return;
        }
        return build(false, undefined, undefined, selected);
    });
}
exports.recipes = recipes;
async function view(mode) {
    if (mode) {
        logger.log(`VIEW command invoked with mode: ${mode}.`);
    }
    else {
        logger.log('VIEW command invoked.');
    }
    if (!vscode.window.activeTextEditor) {
        logger.log('Cannot find active TextEditor.');
        return;
    }
    if (!lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        logger.log('Active document is not a TeX file.');
        return;
    }
    const rootFile = await lw.manager.findRoot();
    if (rootFile === undefined) {
        logger.log('Cannot find LaTeX root PDF to view.');
        return;
    }
    let pickedRootFile = rootFile;
    if (lw.manager.localRootFile) {
        // We are using the subfile package
        pickedRootFile = await quickPickRootFile(rootFile, lw.manager.localRootFile, 'view');
    }
    if (!pickedRootFile) {
        return;
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    const tabEditorGroup = configuration.get('view.pdf.tab.editorGroup');
    const viewer = typeof mode === 'string' ? mode : configuration.get('view.pdf.viewer', 'tab');
    if (viewer === 'browser') {
        return lw.viewer.openBrowser(pickedRootFile);
    }
    else if (viewer === 'tab') {
        return lw.viewer.openTab(pickedRootFile, tabEditorGroup, true);
    }
    else if (viewer === 'external') {
        lw.viewer.openExternal(pickedRootFile);
        return;
    }
    return;
}
exports.view = view;
function refresh() {
    logger.log('REFRESH command invoked.');
    lw.viewer.refreshExistingViewer();
}
exports.refresh = refresh;
function kill() {
    logger.log('KILL command invoked.');
    lw.builder.kill();
}
exports.kill = kill;
function synctex() {
    logger.log('SYNCTEX command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        logger.log('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.');
        return;
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.manager.getWorkspaceFolderRootDir());
    let pdfFile = undefined;
    if (lw.manager.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
        pdfFile = lw.manager.tex2pdf(lw.manager.localRootFile);
    }
    else if (lw.manager.rootFile !== undefined) {
        pdfFile = lw.manager.tex2pdf(lw.manager.rootFile);
    }
    lw.locator.syncTeX(undefined, undefined, pdfFile);
}
exports.synctex = synctex;
function synctexonref(line, filePath) {
    logger.log('SYNCTEX command invoked on a reference.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        logger.log('Cannot start SyncTeX. The active editor is undefined, or the document is not a TeX document.');
        return;
    }
    lw.locator.syncTeXOnRef({ line, filePath });
}
exports.synctexonref = synctexonref;
async function clean() {
    logger.log('CLEAN command invoked.');
    const rootFile = await lw.manager.findRoot();
    if (rootFile === undefined) {
        logger.log('Cannot find LaTeX root file to clean.');
        return;
    }
    let pickedRootFile = rootFile;
    if (lw.manager.localRootFile) {
        // We are using the subfile package
        pickedRootFile = await quickPickRootFile(rootFile, lw.manager.localRootFile, 'clean');
        if (!pickedRootFile) {
            return;
        }
    }
    return lw.cleaner.clean(pickedRootFile);
}
exports.clean = clean;
function addTexRoot() {
    logger.log('ADDTEXROOT command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        return;
    }
    lw.texMagician.addTexRoot();
}
exports.addTexRoot = addTexRoot;
function citation() {
    logger.log('CITATION command invoked.');
    lw.completer.citation.browser();
}
exports.citation = citation;
function wordcount() {
    logger.log('WORDCOUNT command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId) ||
        lw.manager.rootFile === vscode.window.activeTextEditor.document.fileName) {
        if (lw.manager.rootFile) {
            lw.counter.count(lw.manager.rootFile);
        }
        else {
            logger.log('WORDCOUNT: No rootFile defined.');
        }
    }
    else {
        lw.counter.count(vscode.window.activeTextEditor.document.fileName, false);
    }
}
exports.wordcount = wordcount;
function showLog(compiler) {
    logger.log(`SHOWLOG command invoked: ${compiler || 'default'}`);
    if (compiler) {
        logger.showCompilerLog();
    }
    else {
        logger.showLog();
    }
}
exports.showLog = showLog;
function gotoSection(filePath, lineNumber) {
    logger.log(`GOTOSECTION command invoked. Target ${filePath}, line ${lineNumber}`);
    const activeEditor = vscode.window.activeTextEditor;
    void vscode.workspace.openTextDocument(filePath).then((doc) => {
        void vscode.window.showTextDocument(doc).then(() => {
            // input lineNumber is one-based, while editor position is zero-based.
            void vscode.commands.executeCommand('revealLine', { lineNumber, at: 'center' });
            if (activeEditor) {
                activeEditor.selection = new vscode.Selection(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber, 0));
            }
        });
    });
}
exports.gotoSection = gotoSection;
function navigateToEnvPair() {
    logger.log('JumpToEnvPair command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        return;
    }
    void lw.envPair.gotoPair();
}
exports.navigateToEnvPair = navigateToEnvPair;
function selectEnvContent(mode) {
    logger.log('SelectEnv command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        return;
    }
    void lw.envPair.selectEnvContent(mode);
}
exports.selectEnvContent = selectEnvContent;
function selectEnvName() {
    logger.log('SelectEnvName command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        return;
    }
    void lw.envPair.envNameAction('selection');
}
exports.selectEnvName = selectEnvName;
function multiCursorEnvName() {
    logger.log('MutliCursorEnvName command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        return;
    }
    void lw.envPair.envNameAction('cursor');
}
exports.multiCursorEnvName = multiCursorEnvName;
function toggleEquationEnv() {
    logger.log('toggleEquationEnv command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        return;
    }
    void lw.envPair.envNameAction('equationToggle');
}
exports.toggleEquationEnv = toggleEquationEnv;
function closeEnv() {
    logger.log('CloseEnv command invoked.');
    if (!vscode.window.activeTextEditor || !lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        return;
    }
    void lw.envPair.closeEnv();
}
exports.closeEnv = closeEnv;
async function changeHostName() {
    logger.log('CHANGEHOSTNAME command invoked.');
    const proceed = (await vscode.window.showInputBox({
        prompt: 'Changing LaTeX Workshop server hostname can expose your computer to the public and is under severe security risk. CORS is also disabled. Do you want to continue?',
        placeHolder: 'Type CONFIRM then [Enter] to continue. Press [ESC] to keep you safe.'
    }))?.toLowerCase() === 'confirm';
    if (!proceed) {
        return;
    }
    const hostname = await vscode.window.showInputBox({
        prompt: 'Please input the new hostname that LaTeX Workshop server will listen to. This change will be reset on closing VSCode.',
        placeHolder: '127.0.0.1'
    });
    if (!hostname) {
        return;
    }
    lw.server.initializeHttpServer(hostname);
}
exports.changeHostName = changeHostName;
function resetHostName() {
    logger.log('RESETHOSTNAME command invoked.');
    lw.server.initializeHttpServer('127.0.0.1');
    void vscode.window.showInformationMessage('LaTeX Workshop server listening to 127.0.0.1 with CORS. You are safe now.');
}
exports.resetHostName = resetHostName;
async function actions() {
    logger.log('ACTIONS command invoked.');
    return vscode.commands.executeCommand('workbench.view.extension.latex-workshop-activitybar').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'));
}
exports.actions = actions;
/**
 * Insert the snippet with name name.
 * @param name  the name of a snippet contained in latex.json
 */
async function insertSnippet(name) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    switch (name) {
        case 'wrapEnv':
            await editor.insertSnippet(new vscode.SnippetString('\n\\begin{$1}\n\t${0:${TM_SELECTED_TEXT}}\n\\end{$1}'));
            return;
        case 'item':
            await editor.insertSnippet(new vscode.SnippetString('\n\\item '));
            return;
        default:
            return;
    }
}
exports.insertSnippet = insertSnippet;
/**
 * If the current line starts with \item or \item[], do the same for
 * the new line when hitting enter.
 * Note that hitting enter on a line containing only \item or \item[]
 * actually deletes the content of the line.
 */
function onEnterKey(modifiers) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    if (!configuration.get('bind.enter.key')) {
        return vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' });
    }
    if (modifiers === 'alt') {
        return vscode.commands.executeCommand('editor.action.insertLineAfter');
    }
    // Test if every cursor is at the end of a line starting with \item
    const allCursorsOnItem = editor.selections.every((selection) => {
        const cursorPos = selection.active;
        const line = editor.document.lineAt(cursorPos.line);
        return /^\s*\\item/.test(line.text) && (line.text.substring(cursorPos.character).trim().length === 0);
    });
    if (!allCursorsOnItem) {
        return vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' });
    }
    return editor.edit(editBuilder => {
        // If we arrive here, all the cursors are at the end of a line starting with `\s*\\item`.
        // Yet, we keep the conditions for the sake of maintenance.
        for (const selection of editor.selections) {
            const cursorPos = selection.active;
            const line = editor.document.lineAt(cursorPos.line);
            const indentation = line.text.substring(0, line.firstNonWhitespaceCharacterIndex);
            if (/^\s*\\item(\[\s*\])?\s*$/.test(line.text)) {
                // The line is an empty \item or \item[]
                const rangeToDelete = line.range.with(cursorPos.with(line.lineNumber, line.firstNonWhitespaceCharacterIndex), line.range.end);
                editBuilder.delete(rangeToDelete);
            }
            else if (/^\s*\\item\[[^[\]]*\]/.test(line.text)) {
                // The line starts with \item[blabla] or \item[] blabla
                const itemString = `\n${indentation}\\item[] `;
                editBuilder.insert(cursorPos, itemString);
            }
            else if (/^\s*\\item\s*[^\s]+.*$/.test(line.text)) {
                // The line starts with \item blabla
                const itemString = `\n${indentation}\\item `;
                editBuilder.insert(cursorPos, itemString);
            }
            else {
                // If we do not know what to do, insert a newline and indent using the current indentation
                editBuilder.insert(cursorPos, `\n${indentation}`);
            }
        }
    });
}
exports.onEnterKey = onEnterKey;
/**
* Toggle a keyword. This function works with multi-cursors or multi-selections
*
* If the selection is empty, a snippet is added.
*
* If the selection is not empty and matches `\keyword{...}`, it is replaced by
* the argument of `keyword`. If the selection does not start with `\keyword`, it is surrounded by `\keyword{...}`.
*
*  @param keyword the keyword to toggle without backslash eg. textbf or underline
*/
async function toggleSelectedKeyword(keyword) {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        return;
    }
    const editActions = [];
    const snippetActions = [];
    for (const selection of editor.selections) {
        // If the selection is empty, determine if a snippet should be inserted or the cursor is inside \keyword{...}
        if (selection.isEmpty) {
            const surroundingCommandRange = (0, utils_1.getSurroundingCommandRange)(keyword, selection.anchor, editor.document);
            if (surroundingCommandRange) {
                editActions.push({ range: surroundingCommandRange.range, text: surroundingCommandRange.arg });
            }
            else {
                snippetActions.push(selection.anchor);
            }
            continue;
        }
        // When the selection is not empty, decide if \keyword must be inserted or removed
        const text = editor.document.getText(selection);
        if (text.startsWith(`\\${keyword}{`) || text.startsWith(`${keyword}{`)) {
            const start = text.indexOf('{') + 1;
            const insideText = text.slice(start).slice(0, -1);
            editActions.push({ range: selection, text: insideText });
        }
        else {
            editActions.push({ range: selection, text: `\\${keyword}{${text}}` });
        }
    }
    if (editActions.length === 0 && snippetActions.length > 0) {
        const snippet = new vscode.SnippetString(`\\\\${keyword}{$1}`);
        await editor.insertSnippet(snippet, snippetActions);
    }
    else if (editActions.length > 0 && snippetActions.length === 0) {
        await editor.edit((editBuilder) => {
            editActions.forEach(action => {
                editBuilder.replace(action.range, action.text);
            });
        });
    }
    else {
        logger.log('toggleSelectedKeyword: cannot handle mixed edit and snippet actions');
    }
}
exports.toggleSelectedKeyword = toggleSelectedKeyword;
/**
 * Shift the level sectioning in the selection by one (up or down)
 * @param change
 */
function shiftSectioningLevel(change) {
    lw.section.shiftSectioningLevel(change);
}
exports.shiftSectioningLevel = shiftSectioningLevel;
function selectSection() {
    lw.section.selectSection();
}
exports.selectSection = selectSection;
function devParseLog() {
    if (vscode.window.activeTextEditor === undefined) {
        return;
    }
    parser_1.parser.parseLog(vscode.window.activeTextEditor.document.getText());
}
exports.devParseLog = devParseLog;
async function devParseTeX() {
    if (vscode.window.activeTextEditor === undefined) {
        return;
    }
    const ast = await parser_1.parser.parseLatex(vscode.window.activeTextEditor.document.getText());
    return vscode.workspace.openTextDocument({ content: JSON.stringify(ast, null, 2), language: 'json' }).then(doc => vscode.window.showTextDocument(doc));
}
exports.devParseTeX = devParseTeX;
async function devParseBib() {
    if (vscode.window.activeTextEditor === undefined) {
        return;
    }
    const ast = await parser_1.parser.parseBibtex(vscode.window.activeTextEditor.document.getText());
    return vscode.workspace.openTextDocument({ content: JSON.stringify(ast, null, 2), language: 'json' }).then(doc => vscode.window.showTextDocument(doc));
}
exports.devParseBib = devParseBib;
function texdoc(packageName) {
    lw.texdoc.texdoc(packageName);
}
exports.texdoc = texdoc;
function texdocUsepackages() {
    lw.texdoc.texdocUsepackages();
}
exports.texdocUsepackages = texdocUsepackages;
async function saveActive() {
    await lw.builder.saveActive();
}
exports.saveActive = saveActive;
function openMathPreviewPanel() {
    return lw.mathPreviewPanel.open();
}
exports.openMathPreviewPanel = openMathPreviewPanel;
function closeMathPreviewPanel() {
    lw.mathPreviewPanel.close();
}
exports.closeMathPreviewPanel = closeMathPreviewPanel;
function toggleMathPreviewPanel() {
    lw.mathPreviewPanel.toggle();
}
exports.toggleMathPreviewPanel = toggleMathPreviewPanel;
async function quickPickRootFile(rootFile, localRootFile, verb) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile));
    const doNotPrompt = configuration.get('latex.rootFile.doNotPrompt');
    if (doNotPrompt) {
        if (configuration.get('latex.rootFile.useSubFile')) {
            return localRootFile;
        }
        else {
            return rootFile;
        }
    }
    const pickedRootFile = await vscode.window.showQuickPick([{
            label: 'Default root file',
            description: `Path: ${rootFile}`
        }, {
            label: 'Subfiles package root file',
            description: `Path: ${localRootFile}`
        }], {
        placeHolder: `Subfiles package detected. Which file to ${verb}?`,
        matchOnDescription: true
    }).then(selected => {
        if (!selected) {
            return;
        }
        switch (selected.label) {
            case 'Default root file':
                return rootFile;
            case 'Subfiles package root file':
                return localRootFile;
            default:
                return;
        }
    });
    return pickedRootFile;
}
//# sourceMappingURL=commander.js.map