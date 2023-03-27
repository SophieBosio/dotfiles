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
exports.Package = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const latex_utensils_1 = require("latex-utensils");
const lw = __importStar(require("../../lw"));
class Package {
    constructor() {
        this.suggestions = [];
        this.packageDeps = {};
        this.packageOptions = {};
    }
    initialize(defaultPackages) {
        Object.values(defaultPackages).forEach(item => {
            const pack = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module);
            pack.detail = item.detail;
            pack.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`);
            this.suggestions.push(pack);
        });
    }
    provideFrom() {
        return this.provide();
    }
    provide() {
        if (this.suggestions.length === 0) {
            const pkgs = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/packagenames.json`).toString());
            this.initialize(pkgs);
        }
        return this.suggestions;
    }
    setPackageDeps(packageName, deps) {
        this.packageDeps[packageName] = deps;
    }
    setPackageOptions(packageName, options) {
        this.packageOptions[packageName] = options;
    }
    getPackageOptions(packageName) {
        return this.packageOptions[packageName] || [];
    }
    getPackageDeps(packageName) {
        return this.packageDeps[packageName] || {};
    }
    getPackagesIncluded(languageId) {
        const packages = {};
        const config = vscode.workspace.getConfiguration('latex-workshop');
        const excluded = config.get('intellisense.package.exclude');
        if (!excluded.includes('lw-default')) {
            if (['latex', 'latex-expl3'].includes(languageId)) {
                packages['latex-document'] = [];
            }
            if (languageId === 'latex-expl3') {
                packages['expl3'] = [];
            }
        }
        config.get('intellisense.package.extra')
            .filter(packageName => !excluded.includes(packageName))
            .forEach(packageName => packages[packageName] = []);
        lw.cacher.getIncludedTeX().forEach(tex => {
            const included = lw.cacher.get(tex)?.elements.package;
            if (included === undefined) {
                return;
            }
            Object.entries(included)
                .filter(([packageName,]) => !excluded.includes(packageName))
                .forEach(([packageName, options]) => packages[packageName] = options);
        });
        while (true) {
            let newPackageInserted = false;
            Object.entries(packages).forEach(([packageName, options]) => Object.keys(this.getPackageDeps(packageName))
                .filter(includeName => !excluded.includes(includeName))
                .forEach(includeName => {
                const dependOptions = this.getPackageDeps(packageName)[includeName];
                const hasOption = dependOptions.length === 0
                    || options.filter(option => dependOptions.includes(option)).length > 0;
                if (packages[includeName] === undefined && hasOption) {
                    packages[includeName] = [];
                    newPackageInserted = true;
                }
            }));
            if (!newPackageInserted) {
                break;
            }
        }
        return packages;
    }
    /**
     * Updates the cache for packages used in `file` with `nodes`. If `nodes` is
     * `undefined`, `content` is parsed with regular expressions, and the result
     * is used to update the cache.
     *
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    updateUsepackage(file, nodes, content) {
        if (nodes !== undefined) {
            this.updateUsepackageNodes(file, nodes);
        }
        else if (content !== undefined) {
            const pkgReg = /\\usepackage(\[[^[\]{}]*\])?{(.*)}/gs;
            while (true) {
                const result = pkgReg.exec(content);
                if (result === null) {
                    break;
                }
                const packages = result[2].split(',').map(packageName => packageName.trim());
                const options = (result[1] || '[]').slice(1, -1).replace(/\s*=\s*/g, '=').split(',').map(option => option.trim());
                const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''));
                packages.forEach(packageName => this.pushUsepackage(file, packageName, [...options, ...optionsNoTrue]));
            }
        }
    }
    updateUsepackageNodes(file, nodes) {
        nodes.forEach(node => {
            if (latex_utensils_1.latexParser.isCommand(node) && (node.name === 'usepackage' || node.name === 'documentclass')) {
                let options = [];
                node.args.forEach(arg => {
                    if (latex_utensils_1.latexParser.isOptionalArg(arg)) {
                        options = arg.content.filter(latex_utensils_1.latexParser.isTextString).filter(str => str.content !== ',').map(str => str.content);
                        const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''));
                        options = [...options, ...optionsNoTrue];
                        return;
                    }
                    for (const c of arg.content) {
                        if (!latex_utensils_1.latexParser.isTextString(c)) {
                            continue;
                        }
                        c.content.split(',').forEach(packageName => this.pushUsepackage(file, packageName, options, node));
                    }
                });
            }
            else {
                if (latex_utensils_1.latexParser.hasContentArray(node)) {
                    this.updateUsepackageNodes(file, node.content);
                }
            }
        });
    }
    pushUsepackage(fileName, packageName, options, node) {
        packageName = packageName.trim();
        if (packageName === '') {
            return;
        }
        if (node?.name === 'documentclass') {
            packageName = 'class-' + packageName;
        }
        const cache = lw.cacher.get(fileName);
        if (cache === undefined) {
            return;
        }
        cache.elements.package = cache.elements.package || {};
        cache.elements.package[packageName] = options;
    }
}
exports.Package = Package;
//# sourceMappingURL=package.js.map