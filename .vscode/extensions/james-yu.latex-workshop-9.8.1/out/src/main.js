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
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("./lw"));
const viewer_1 = require("./components/viewer");
const mathpreviewpanel_1 = require("./components/mathpreviewpanel");
const bibtexcompletion_1 = require("./providers/bibtexcompletion");
const hover_1 = require("./providers/hover");
const docsymbol_1 = require("./providers/docsymbol");
const projectsymbol_1 = require("./providers/projectsymbol");
const definition_1 = require("./providers/definition");
const latexformatter_1 = require("./providers/latexformatter");
const folding_1 = require("./providers/folding");
const selection_1 = require("./providers/selection");
const bibtexformatter_1 = require("./providers/bibtexformatter");
const logger_1 = require("./components/logger");
const eventbus_1 = require("./components/eventbus");
const logger = (0, logger_1.getLogger)('Extension');
function activate(extensionContext) {
    void vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true);
    const lwDisposable = lw.init(extensionContext);
    lw.registerDisposable(lwDisposable);
    registerLatexWorkshopCommands();
    lw.registerDisposable(vscode.workspace.onDidSaveTextDocument((e) => {
        if (lw.lwfs.isVirtualUri(e.uri)) {
            return;
        }
        if (lw.manager.hasTexId(e.languageId)) {
            logger.log(`onDidSaveTextDocument triggered: ${e.uri.toString(true)}`);
            lw.linter.lintRootFileIfEnabled();
            void lw.builder.buildOnSaveIfEnabled(e.fileName);
            lw.counter.countOnSaveIfEnabled(e.fileName);
        }
    }));
    /** The previous active TeX document path. If this changed, root need to be re-searched */
    let prevTeXDocumentPath;
    // This function will be called when a new text is opened, or an inactive editor is reactivated after vscode reload
    lw.registerDisposable(vscode.workspace.onDidOpenTextDocument(async (e) => {
        if (lw.lwfs.isVirtualUri(e.uri)) {
            return;
        }
        if (lw.manager.hasTexId(e.languageId) && e.fileName !== prevTeXDocumentPath) {
            prevTeXDocumentPath = e.fileName;
            await lw.manager.findRoot();
        }
    }));
    let isLaTeXActive = false;
    lw.registerDisposable(vscode.window.onDidChangeActiveTextEditor(async (e) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (vscode.window.visibleTextEditors.filter(editor => lw.manager.hasTexId(editor.document.languageId)).length > 0) {
            logger.showStatus();
            if (configuration.get('view.autoFocus.enabled') && !isLaTeXActive) {
                void vscode.commands.executeCommand('workbench.view.lw.latex-workshop-activitybar').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'));
            }
            isLaTeXActive = true;
        }
        else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId.toLowerCase() === 'log') {
            logger.showStatus();
        }
        if (e && lw.lwfs.isVirtualUri(e.document.uri)) {
            return;
        }
        if (e && lw.manager.hasTexId(e.document.languageId) && e.document.fileName !== prevTeXDocumentPath) {
            prevTeXDocumentPath = e.document.fileName;
            await lw.manager.findRoot();
            lw.linter.lintRootFileIfEnabled();
        }
        else if (!e || !lw.manager.hasBibtexId(e.document.languageId)) {
            isLaTeXActive = false;
        }
    }));
    let updateCompleter;
    lw.registerDisposable(vscode.workspace.onDidChangeTextDocument((e) => {
        lw.eventBus.fire(eventbus_1.DocumentChanged);
        if (lw.lwfs.isVirtualUri(e.document.uri)) {
            return;
        }
        if (!lw.manager.hasTexId(e.document.languageId)) {
            return;
        }
        lw.linter.lintActiveFileIfEnabledAfterInterval(e.document);
        if (!lw.cacher.has(e.document.fileName)) {
            return;
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        if (configuration.get('intellisense.update.aggressive.enabled')) {
            if (updateCompleter) {
                clearTimeout(updateCompleter);
            }
            updateCompleter = setTimeout(() => {
                const file = e.document.uri.fsPath;
                void lw.cacher.refreshCache(file, lw.manager.rootFile).then(async () => {
                    await lw.cacher.loadFlsFile(lw.manager.rootFile || file);
                });
            }, configuration.get('intellisense.update.delay', 1000));
        }
    }));
    lw.registerDisposable(vscode.window.onDidChangeTextEditorSelection((e) => {
        if (lw.manager.hasTexId(e.textEditor.document.languageId) ||
            lw.manager.hasBibtexId(e.textEditor.document.languageId) ||
            lw.manager.hasDoctexId(e.textEditor.document.languageId)) {
            return lw.structureViewer.showCursorItem(e);
        }
        return;
    }));
    registerProviders();
    void lw.manager.findRoot().then(() => {
        lw.linter.lintRootFileIfEnabled();
        if (lw.manager.hasTexId(vscode.window.activeTextEditor?.document.languageId ?? '')) {
            prevTeXDocumentPath = vscode.window.activeTextEditor?.document.fileName;
        }
    });
    conflictCheck();
}
exports.activate = activate;
function registerLatexWorkshopCommands() {
    lw.registerDisposable(vscode.commands.registerCommand('latex-workshop.saveWithoutBuilding', () => lw.commander.saveActive()), vscode.commands.registerCommand('latex-workshop.build', () => lw.commander.build()), vscode.commands.registerCommand('latex-workshop.recipes', (recipe) => lw.commander.recipes(recipe)), vscode.commands.registerCommand('latex-workshop.view', (mode) => lw.commander.view(mode)), vscode.commands.registerCommand('latex-workshop.refresh-viewer', () => lw.commander.refresh()), vscode.commands.registerCommand('latex-workshop.tab', () => lw.commander.view('tab')), vscode.commands.registerCommand('latex-workshop.viewInBrowser', () => lw.commander.view('browser')), vscode.commands.registerCommand('latex-workshop.viewExternal', () => lw.commander.view('external')), vscode.commands.registerCommand('latex-workshop.kill', () => lw.commander.kill()), vscode.commands.registerCommand('latex-workshop.synctex', () => lw.commander.synctex()), vscode.commands.registerCommand('latex-workshop.texdoc', (packageName) => lw.commander.texdoc(packageName)), vscode.commands.registerCommand('latex-workshop.texdocUsepackages', () => lw.commander.texdocUsepackages()), vscode.commands.registerCommand('latex-workshop.synctexto', (line, filePath) => lw.commander.synctexonref(line, filePath)), vscode.commands.registerCommand('latex-workshop.clean', () => lw.commander.clean()), vscode.commands.registerCommand('latex-workshop.actions', () => lw.commander.actions()), vscode.commands.registerCommand('latex-workshop.activate', () => undefined), vscode.commands.registerCommand('latex-workshop.citation', () => lw.commander.citation()), vscode.commands.registerCommand('latex-workshop.addtexroot', () => lw.commander.addTexRoot()), vscode.commands.registerCommand('latex-workshop.wordcount', () => lw.commander.wordcount()), vscode.commands.registerCommand('latex-workshop.log', () => lw.commander.showLog()), vscode.commands.registerCommand('latex-workshop.compilerlog', () => lw.commander.showLog('compiler')), vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => lw.codeActions.runCodeAction(d, r, c, m)), vscode.commands.registerCommand('latex-workshop.goto-section', (filePath, lineNumber) => lw.commander.gotoSection(filePath, lineNumber)), vscode.commands.registerCommand('latex-workshop.navigate-envpair', () => lw.commander.navigateToEnvPair()), vscode.commands.registerCommand('latex-workshop.select-envcontent', () => lw.commander.selectEnvContent('content')), vscode.commands.registerCommand('latex-workshop.select-env', () => lw.commander.selectEnvContent('whole')), vscode.commands.registerCommand('latex-workshop.select-envname', () => lw.commander.selectEnvName()), vscode.commands.registerCommand('latex-workshop.multicursor-envname', () => lw.commander.multiCursorEnvName()), vscode.commands.registerCommand('latex-workshop.toggle-equation-envname', () => lw.commander.toggleEquationEnv()), vscode.commands.registerCommand('latex-workshop.close-env', () => lw.commander.closeEnv()), vscode.commands.registerCommand('latex-workshop.wrap-env', () => lw.commander.insertSnippet('wrapEnv')), vscode.commands.registerCommand('latex-workshop.onEnterKey', () => lw.commander.onEnterKey()), vscode.commands.registerCommand('latex-workshop.onAltEnterKey', () => lw.commander.onEnterKey('alt')), vscode.commands.registerCommand('latex-workshop.revealOutputDir', () => lw.commander.revealOutputDir()), vscode.commands.registerCommand('latex-workshop.changeHostName', () => lw.commander.changeHostName()), vscode.commands.registerCommand('latex-workshop.resetHostName', () => lw.commander.resetHostName()), vscode.commands.registerCommand('latex-workshop-dev.parselog', () => lw.commander.devParseLog()), vscode.commands.registerCommand('latex-workshop-dev.parsetex', () => lw.commander.devParseTeX()), vscode.commands.registerCommand('latex-workshop-dev.parsebib', () => lw.commander.devParseBib()), vscode.commands.registerCommand('latex-workshop.shortcut.item', () => lw.commander.insertSnippet('item')), vscode.commands.registerCommand('latex-workshop.shortcut.emph', () => lw.commander.toggleSelectedKeyword('emph')), vscode.commands.registerCommand('latex-workshop.shortcut.textbf', () => lw.commander.toggleSelectedKeyword('textbf')), vscode.commands.registerCommand('latex-workshop.shortcut.textit', () => lw.commander.toggleSelectedKeyword('textit')), vscode.commands.registerCommand('latex-workshop.shortcut.underline', () => lw.commander.toggleSelectedKeyword('underline')), vscode.commands.registerCommand('latex-workshop.shortcut.textrm', () => lw.commander.toggleSelectedKeyword('textrm')), vscode.commands.registerCommand('latex-workshop.shortcut.texttt', () => lw.commander.toggleSelectedKeyword('texttt')), vscode.commands.registerCommand('latex-workshop.shortcut.textsl', () => lw.commander.toggleSelectedKeyword('textsl')), vscode.commands.registerCommand('latex-workshop.shortcut.textsc', () => lw.commander.toggleSelectedKeyword('textsc')), vscode.commands.registerCommand('latex-workshop.shortcut.textnormal', () => lw.commander.toggleSelectedKeyword('textnormal')), vscode.commands.registerCommand('latex-workshop.shortcut.textsuperscript', () => lw.commander.toggleSelectedKeyword('textsuperscript')), vscode.commands.registerCommand('latex-workshop.shortcut.textsubscript', () => lw.commander.toggleSelectedKeyword('textsubscript')), vscode.commands.registerCommand('latex-workshop.shortcut.mathbf', () => lw.commander.toggleSelectedKeyword('mathbf')), vscode.commands.registerCommand('latex-workshop.shortcut.mathit', () => lw.commander.toggleSelectedKeyword('mathit')), vscode.commands.registerCommand('latex-workshop.shortcut.mathrm', () => lw.commander.toggleSelectedKeyword('mathrm')), vscode.commands.registerCommand('latex-workshop.shortcut.mathtt', () => lw.commander.toggleSelectedKeyword('mathtt')), vscode.commands.registerCommand('latex-workshop.shortcut.mathsf', () => lw.commander.toggleSelectedKeyword('mathsf')), vscode.commands.registerCommand('latex-workshop.shortcut.mathbb', () => lw.commander.toggleSelectedKeyword('mathbb')), vscode.commands.registerCommand('latex-workshop.shortcut.mathcal', () => lw.commander.toggleSelectedKeyword('mathcal')), vscode.commands.registerCommand('latex-workshop.surround', () => lw.completer.command.surround()), vscode.commands.registerCommand('latex-workshop.promote-sectioning', () => lw.commander.shiftSectioningLevel('promote')), vscode.commands.registerCommand('latex-workshop.demote-sectioning', () => lw.commander.shiftSectioningLevel('demote')), vscode.commands.registerCommand('latex-workshop.select-section', () => lw.commander.selectSection()), vscode.commands.registerCommand('latex-workshop.bibsort', () => (0, bibtexformatter_1.bibtexFormat)(true, false)), vscode.commands.registerCommand('latex-workshop.bibalign', () => (0, bibtexformatter_1.bibtexFormat)(false, true)), vscode.commands.registerCommand('latex-workshop.bibalignsort', () => (0, bibtexformatter_1.bibtexFormat)(true, true)), vscode.commands.registerCommand('latex-workshop.openMathPreviewPanel', () => lw.commander.openMathPreviewPanel()), vscode.commands.registerCommand('latex-workshop.closeMathPreviewPanel', () => lw.commander.closeMathPreviewPanel()), vscode.commands.registerCommand('latex-workshop.toggleMathPreviewPanel', () => lw.commander.toggleMathPreviewPanel()));
}
function registerProviders() {
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    // According to cmhughes/latexindent.pl, it aims to beautify .tex, .sty and .cls files.
    const latexindentSelector = selectDocumentsWithId(['tex', 'latex', 'latex-expl3']);
    const latexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'pweave', 'jlweave', 'rsweave']);
    const weaveSelector = selectDocumentsWithId(['pweave', 'jlweave', 'rsweave']);
    const latexDoctexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'pweave', 'jlweave', 'rsweave', 'doctex']);
    const bibtexSelector = selectDocumentsWithId(['bibtex']);
    lw.registerDisposable(vscode.languages.registerDocumentFormattingEditProvider(latexindentSelector, latexformatter_1.latexFormatterProvider), vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'bibtex' }, bibtexformatter_1.bibtexFormatterProvider), vscode.languages.registerDocumentRangeFormattingEditProvider(latexindentSelector, latexformatter_1.latexFormatterProvider), vscode.languages.registerDocumentRangeFormattingEditProvider({ scheme: 'file', language: 'bibtex' }, bibtexformatter_1.bibtexFormatterProvider));
    lw.registerDisposable(vscode.window.registerWebviewPanelSerializer('latex-workshop-pdf', viewer_1.pdfViewerPanelSerializer), vscode.window.registerCustomEditorProvider('latex-workshop-pdf-hook', viewer_1.pdfViewerHookProvider, { supportsMultipleEditorsPerDocument: true, webviewOptions: { retainContextWhenHidden: true } }), vscode.window.registerWebviewPanelSerializer('latex-workshop-mathpreview', new mathpreviewpanel_1.MathPreviewPanelSerializer()));
    lw.registerDisposable(vscode.languages.registerHoverProvider(latexSelector, new hover_1.HoverProvider()), vscode.languages.registerDefinitionProvider(latexSelector, new definition_1.DefinitionProvider()), vscode.languages.registerDocumentSymbolProvider(latexSelector, new docsymbol_1.DocSymbolProvider()), vscode.languages.registerDocumentSymbolProvider(bibtexSelector, new docsymbol_1.DocSymbolProvider()), vscode.languages.registerDocumentSymbolProvider(selectDocumentsWithId(['doctex']), new docsymbol_1.DocSymbolProvider()), vscode.languages.registerWorkspaceSymbolProvider(new projectsymbol_1.ProjectSymbolProvider()));
    lw.registerDisposable(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex' }, lw.completer, '\\', '{'), vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'bibtex' }, new bibtexcompletion_1.BibtexCompleter(), '@'));
    let triggerDisposable;
    const registerTrigger = () => {
        const userTriggersLatex = configuration.get('intellisense.triggers.latex');
        const latexTriggers = ['\\', ','].concat(userTriggersLatex);
        logger.log(`Trigger characters for intellisense of LaTeX documents: ${JSON.stringify(latexTriggers)}`);
        triggerDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.completer, ...latexTriggers);
        lw.registerDisposable(triggerDisposable);
    };
    registerTrigger();
    lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('latex-workshop.intellisense.triggers.latex')) {
            if (triggerDisposable) {
                triggerDisposable.dispose();
                triggerDisposable = undefined;
            }
            registerTrigger();
        }
        return;
    }));
    let atSuggestionDisposable;
    const registerAtSuggestion = () => {
        const atSuggestionLatexTrigger = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.atSuggestion.trigger.latex');
        if (atSuggestionLatexTrigger !== '') {
            lw.atSuggestionCompleter.updateTrigger();
            atSuggestionDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.atSuggestionCompleter, atSuggestionLatexTrigger);
            lw.registerDisposable(atSuggestionDisposable);
        }
    };
    registerAtSuggestion();
    lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('latex-workshop.intellisense.atSuggestion.trigger.latex')) {
            if (atSuggestionDisposable) {
                atSuggestionDisposable.dispose();
                atSuggestionDisposable = undefined;
            }
            registerAtSuggestion();
        }
        return;
    }));
    lw.registerDisposable(vscode.languages.registerCodeActionsProvider(latexSelector, lw.codeActions), vscode.languages.registerFoldingRangeProvider(latexSelector, new folding_1.FoldingProvider()), vscode.languages.registerFoldingRangeProvider(weaveSelector, new folding_1.WeaveFoldingProvider()));
    const selectionLatex = configuration.get('selection.smart.latex.enabled', true);
    if (selectionLatex) {
        lw.registerDisposable(vscode.languages.registerSelectionRangeProvider({ language: 'latex' }, new selection_1.SelectionRangeProvider()));
    }
    lw.registerDisposable(vscode.window.registerWebviewViewProvider('latex-workshop-snippet-view', lw.snippetView.snippetViewProvider, { webviewOptions: { retainContextWhenHidden: true } }));
}
function conflictCheck() {
    function check(ID, name, suggestion) {
        if (vscode.extensions.getExtension(ID) !== undefined) {
            void vscode.window.showWarningMessage(`LaTeX Workshop is incompatible with  "${name}". ${suggestion}`);
        }
    }
    check('tomoki1207.pdf', 'vscode-pdf', 'We compete when opening a PDF file from the sidebar. Please consider disabling either extension.');
}
function selectDocumentsWithId(ids) {
    const selector = ids.map((id) => {
        return { scheme: 'file', language: id };
    });
    return selector;
}
//# sourceMappingURL=main.js.map