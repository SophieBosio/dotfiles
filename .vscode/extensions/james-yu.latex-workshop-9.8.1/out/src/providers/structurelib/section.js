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
exports.Section = exports.SectionKind = void 0;
const vscode = __importStar(require("vscode"));
var SectionKind;
(function (SectionKind) {
    SectionKind[SectionKind["Env"] = 0] = "Env";
    SectionKind[SectionKind["Label"] = 1] = "Label";
    SectionKind[SectionKind["Section"] = 2] = "Section";
    SectionKind[SectionKind["NoNumberSection"] = 3] = "NoNumberSection";
    SectionKind[SectionKind["BibItem"] = 4] = "BibItem";
    SectionKind[SectionKind["BibField"] = 5] = "BibField";
})(SectionKind = exports.SectionKind || (exports.SectionKind = {}));
class Section extends vscode.TreeItem {
    constructor(kind, label, collapsibleState, depth, lineNumber, toLine, fileName, command) {
        super(label, collapsibleState);
        this.kind = kind;
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.depth = depth;
        this.lineNumber = lineNumber;
        this.toLine = toLine;
        this.fileName = fileName;
        this.command = command;
        this.children = [];
        this.parent = undefined; // The parent of a top level section must be undefined
        this.subfiles = [];
    }
}
exports.Section = Section;
//# sourceMappingURL=section.js.map