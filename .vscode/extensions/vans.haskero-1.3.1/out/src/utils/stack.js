"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const vscode_1 = require("vscode");
const targets_1 = require("./targets");
/**
 * Get targets defined in the project, if error then []
 */
function getTargets(stackPath) {
    return new Promise((resolve, reject) => {
        const cwd = process.cwd();
        process.chdir(vscode_1.workspace.rootPath);
        cp.exec(`${stackPath} ide targets`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            let targets;
            // For some reason stack ide targets writes to stderr
            if (stderr) {
                targets = parseTargets(stderr);
            }
            else {
                targets = [];
            }
            resolve(new targets_1.HaskeroTargets(targets));
        });
        process.chdir(cwd);
    });
}
exports.getTargets = getTargets;
function allMatchs(text, regexp) {
    const matches = [];
    let match;
    while ((match = regexp.exec(text)) != null) {
        matches.push(match);
    }
    return matches;
}
function parseTargets(raw) {
    const regTargets = /^.+[:].+$/mg;
    return allMatchs(raw, regTargets).map(regArr => regArr[0]);
}
//# sourceMappingURL=stack.js.map