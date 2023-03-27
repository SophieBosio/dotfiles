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
exports.MathJaxPool = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const workerpool = __importStar(require("workerpool"));
const supportedExtensionList = [
    'amscd',
    'bbox',
    'boldsymbol',
    'braket',
    'bussproofs',
    'cancel',
    'cases',
    'centernot',
    'colortbl',
    'empheq',
    'enclose',
    'extpfeil',
    'gensymb',
    'html',
    'mathtools',
    'mhchem',
    'physics',
    'textcomp',
    'textmacros',
    'unicode',
    'upgreek',
    'verb'
];
class MathJaxPool {
    static dispose() {
        return {
            dispose: async () => { await MathJaxPool.pool.terminate(true); }
        };
    }
    static initialize() {
        void MathJaxPool.loadExtensions();
        vscode.workspace.onDidChangeConfiguration(async (ev) => {
            if (ev.affectsConfiguration('latex-workshop.hover.preview.mathjax.extensions')) {
                return this.loadExtensions();
            }
        });
    }
    static async typeset(arg, opts) {
        const proxy = await this.proxyPromise;
        const svgHtml = await proxy.typeset(arg, opts).timeout(3000);
        return svgHtml;
    }
    static async loadExtensions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const extensions = configuration.get('hover.preview.mathjax.extensions', []);
        const extensionsToLoad = extensions.filter((ex) => supportedExtensionList.includes(ex));
        const proxy = await this.proxyPromise;
        return proxy.loadExtensions(extensionsToLoad);
    }
}
exports.MathJaxPool = MathJaxPool;
MathJaxPool.pool = workerpool.pool(path.join(__dirname, 'mathjaxpool_worker.js'), { minWorkers: 1, maxWorkers: 1, workerType: 'process' });
MathJaxPool.proxyPromise = MathJaxPool.pool.proxy();
//# sourceMappingURL=mathjaxpool.js.map