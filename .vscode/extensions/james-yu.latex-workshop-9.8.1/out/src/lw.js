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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLogFundamentals = exports.init = exports.mathPreviewPanel = exports.mathPreview = exports.graphicsPreview = exports.snippetView = exports.structureViewer = exports.latexCommanderTreeView = exports.section = exports.envPair = exports.texMagician = exports.codeActions = exports.texdoc = exports.counter = exports.cleaner = exports.linter = exports.duplicateLabels = exports.atSuggestionCompleter = exports.completer = exports.locator = exports.server = exports.viewer = exports.builder = exports.manager = exports.cacher = exports.lwfs = exports.configuration = exports.eventBus = exports.extensionRoot = exports.commander = exports.registerDisposable = void 0;
const vscode_1 = __importDefault(require("vscode"));
const path_1 = __importDefault(require("path"));
const builder_1 = require("./components/builder");
const cacher_1 = require("./components/cacher");
const cleaner_1 = require("./components/cleaner");
const commander_1 = require("./components/commander");
const configuration_1 = require("./components/configuration");
const counter_1 = require("./components/counter");
const duplicatelabels_1 = require("./components/duplicatelabels");
const envpair_1 = require("./components/envpair");
const eventbus_1 = require("./components/eventbus");
const linter_1 = require("./components/linter");
const locator_1 = require("./components/locator");
const lwfs_1 = require("./components/lwfs");
const manager_1 = require("./components/manager");
const mathpreviewpanel_1 = require("./components/mathpreviewpanel");
const parser_1 = require("./components/parser");
const section_1 = require("./components/section");
const server_1 = require("./components/server");
const snippetview_1 = require("./components/snippetview");
const texmagician_1 = require("./components/texmagician");
const viewer_1 = require("./components/viewer");
const codeactions_1 = require("./providers/codeactions");
const completion_1 = require("./providers/completion");
const graphicspreview_1 = require("./providers/preview/graphicspreview");
const mathpreview_1 = require("./providers/preview/mathpreview");
const structure_1 = require("./providers/structure");
const logger_1 = require("./components/logger");
const texdoc_1 = require("./components/texdoc");
const mathjaxpool_1 = require("./providers/preview/mathjaxpool");
let disposables = [];
let context;
function registerDisposable(...items) {
    if (context) {
        context.subscriptions.push(...disposables, ...items);
        disposables = [];
    }
    else {
        disposables = [...disposables, ...items];
    }
}
exports.registerDisposable = registerDisposable;
exports.commander = __importStar(require("./commander"));
exports.extensionRoot = path_1.default.resolve(`${__dirname}/../../`);
exports.eventBus = new eventbus_1.EventBus();
exports.configuration = new configuration_1.Configuration();
exports.lwfs = new lwfs_1.LwFileSystem();
exports.cacher = new cacher_1.Cacher();
exports.manager = new manager_1.Manager();
exports.builder = new builder_1.Builder();
exports.viewer = new viewer_1.Viewer();
exports.server = new server_1.Server();
exports.locator = new locator_1.Locator();
exports.completer = new completion_1.Completer();
exports.atSuggestionCompleter = new completion_1.AtSuggestionCompleter();
exports.duplicateLabels = new duplicatelabels_1.DuplicateLabels();
exports.linter = new linter_1.Linter();
exports.cleaner = new cleaner_1.Cleaner();
exports.counter = new counter_1.Counter();
exports.texdoc = new texdoc_1.TeXDoc();
exports.codeActions = new codeactions_1.CodeActions();
exports.texMagician = new texmagician_1.TeXMagician();
exports.envPair = new envpair_1.EnvPair();
exports.section = new section_1.Section();
exports.latexCommanderTreeView = new commander_1.LaTeXCommanderTreeView();
exports.structureViewer = new structure_1.StructureTreeView();
exports.snippetView = new snippetview_1.SnippetView();
exports.graphicsPreview = new graphicspreview_1.GraphicsPreview();
exports.mathPreview = new mathpreview_1.MathPreview();
exports.mathPreviewPanel = new mathpreviewpanel_1.MathPreviewPanel();
const logger = (0, logger_1.getLogger)('Extension');
function init(extensionContext) {
    context = extensionContext;
    registerDisposable();
    addLogFundamentals();
    logger.initializeStatusBarItem();
    logger.log('LaTeX Workshop initialized.');
    return {
        dispose: () => {
            exports.cacher.reset();
            exports.server.dispose();
            parser_1.parser.dispose();
            mathjaxpool_1.MathJaxPool.dispose();
        }
    };
}
exports.init = init;
function addLogFundamentals() {
    logger.log('Initializing LaTeX Workshop.');
    logger.log(`Extension root: ${exports.extensionRoot}`);
    logger.log(`$PATH: ${process.env.PATH}`);
    logger.log(`$SHELL: ${process.env.SHELL}`);
    logger.log(`$LANG: ${process.env.LANG}`);
    logger.log(`$LC_ALL: ${process.env.LC_ALL}`);
    logger.log(`process.platform: ${process.platform}`);
    logger.log(`process.arch: ${process.arch}`);
    logger.log(`vscode.env.appName: ${vscode_1.default.env.appName}`);
    logger.log(`vscode.env.remoteName: ${vscode_1.default.env.remoteName}`);
    logger.log(`vscode.env.uiKind: ${vscode_1.default.env.uiKind}`);
}
exports.addLogFundamentals = addLogFundamentals;
//# sourceMappingURL=lw.js.map