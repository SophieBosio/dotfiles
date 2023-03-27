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
exports.processWrapper = void 0;
const os = __importStar(require("os"));
const logger_1 = require("../logger");
const logger = (0, logger_1.getLogger)('Linter');
function processWrapper(linterId, proc, stdin) {
    return new Promise((resolve, reject) => {
        const startTime = process.hrtime();
        proc.stdout.setEncoding('binary');
        proc.stderr.setEncoding('binary');
        let stdout = '';
        proc.stdout.on('data', newStdout => {
            stdout += newStdout;
        });
        let stderr = '';
        proc.stderr.on('data', newStderr => {
            stderr += newStderr;
        });
        proc.on('error', err => {
            logger.log(`Linter for ${linterId} failed to spawn command, encountering error: ${err.message}`);
            return reject(err);
        });
        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                let msg;
                if (stderr === '') {
                    msg = stderr;
                }
                else {
                    msg = '\n' + stderr;
                }
                logger.log(`Linter for ${linterId} failed with exit code ${exitCode} and error:${msg}`);
                return reject({ exitCode, stdout, stderr });
            }
            else {
                const [s, ms] = process.hrtime(startTime);
                logger.log(`Linter for ${linterId} successfully finished in ${s}s ${Math.round(ms / 1000000)}ms`);
                return resolve(stdout);
            }
        });
        if (stdin !== undefined) {
            proc.stdin.write(stdin);
            if (!stdin.endsWith(os.EOL)) {
                // Always ensure we end with EOL otherwise ChkTeX will report line numbers as off by 1.
                proc.stdin.write(os.EOL);
            }
            proc.stdin.end();
        }
    });
}
exports.processWrapper = processWrapper;
//# sourceMappingURL=linterutils.js.map