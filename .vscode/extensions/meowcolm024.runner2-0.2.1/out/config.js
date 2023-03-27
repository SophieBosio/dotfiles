"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const vscode = require("vscode");
function getConfig() {
    const config = vscode.workspace.getConfiguration();
    const ghci = config.get("runner2.ghciPath", "ghci");
    const stack = config.get("runner2.stackPath", "stack");
    const mode = config.get("runner2.replTool", "default");
    let tool = (proj) => {
        let repl = stack + " repl";
        switch (mode) {
            case "default": return proj ? repl : ghci;
            case "ghci": return ghci;
            case "stack": return repl;
        }
    };
    return {
        mode: mode,
        ghciPath: ghci,
        stackPath: stack,
        ghciTool: tool,
        enableStackRun: config.get("runner2.stackRun", false)
    };
}
exports.getConfig = getConfig;
//# sourceMappingURL=config.js.map