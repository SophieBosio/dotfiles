'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const debugUtils_1 = require("../debug/debugUtils");
/**
 * A raw response from intero.
 * As intero can respond on stdout and stderr at the same time, it contains both responses
 */
class RawResponse {
    constructor(rawout, rawerr) {
        this.rawout = rawout;
        this.rawerr = rawerr;
    }
}
exports.RawResponse = RawResponse;
/**
 * Package chunks of data in clean unique response
 */
class ResponseReader {
    constructor(stdout, stderr, onAnswer) {
        this.stdout = stdout;
        this.stderr = stderr;
        this.onAnswer = onAnswer;
        // create an instance function to force the 'this' capture
        this.onData = (data) => {
            let chunk = data.toString();
            debugUtils_1.DebugUtils.instance.log('<<< intero onData:\r\n' + chunk);
            //the EOT char is not always at the end of a chunk
            //eg : if we send two questions before the first answer comes back, we can get chunk with the form:
            // end_of_raw_answer1 EOT start_of_raw_answer2
            // or even:
            // end_of_raw_answer1 EOT full_raw_answer2 EOT start_of_raw_answer3
            let responsesChunks = chunk.split(InteroProxy.EOTUtf8);
            this.rawout += responsesChunks.shift();
            while (responsesChunks.length > 0) {
                //On linux, issue with synchronisation between stdout and stderr :
                // - use a set time out to wait 50ms for stderr to finish to write data after we recieve the EOC char from stdin
                setTimeout(this.onResponse(this.rawout), 50);
                this.rawout = responsesChunks.shift();
            }
        };
        // create an instance function to force the 'this' capture
        this.onDataErr = (data) => {
            let chunk = data.toString();
            this.rawerr += chunk;
            debugUtils_1.DebugUtils.instance.log(chunk);
        };
        this.onResponse = (rawout) => () => {
            debugUtils_1.DebugUtils.instance.log('<<< end of intero response');
            this.onAnswer(rawout, this.rawerr);
            this.rawerr = "";
        };
        this.rawout = '';
        this.rawerr = '';
        stdout.on('data', this.onData);
        stderr.on('data', this.onDataErr);
    }
    clear() {
        this.rawerr = '';
        this.rawout = '';
    }
}
/**
 * Handle communication with intero
 * Intero responds on stderr and stdout without any synchronisation
 * InteroProxy hides the complexity behind a simple interface: you send a request and you get a response. All the synchronisation is done by the proxy
 */
class InteroProxy {
    constructor(interoProcess) {
        this.interoProcess = interoProcess;
        this.isInteroProcessUp = true;
        //executed when an error is emitted  on stdin
        this.onStdInError = (er) => {
            debugUtils_1.DebugUtils.instance.log("error stdin : " + er);
            if (this.onRawResponseQueue.length > 0) {
                let resolver = this.onRawResponseQueue.shift();
                resolver.reject(er);
            }
        };
        this.onExit = (code) => {
            this.isInteroProcessUp = false;
            let rawout = this.responseReader.rawout;
            let rawerr = this.responseReader.rawerr;
            this.responseReader.clear();
            this.errorMsg = `process exited with code ${code}\r\n\r\nstdout:\r\n${rawout}\r\n\r\nstderr:\r\n${rawerr}\r\n`;
            if (this.onRawResponseQueue.length > 0) {
                let resolver = this.onRawResponseQueue.shift();
                resolver.reject(this.errorMsg);
            }
        };
        this.onError = (reason) => {
            this.isInteroProcessUp = false;
            this.errorMsg = `Failed to start process 'stack', Haskero must be used on stack projects only. Details: ${reason}`;
        };
        this.onResponse = (rawout, rawerr) => {
            if (this.onRawResponseQueue.length > 0) {
                let resolver = this.onRawResponseQueue.shift();
                resolver.resolve(new RawResponse(rawout, rawerr));
            }
        };
        this.onRawResponseQueue = [];
        this.interoProcess.on('exit', this.onExit);
        this.interoProcess.on('error', this.onError);
        this.responseReader = new ResponseReader(this.interoProcess.stdout, this.interoProcess.stderr, this.onResponse);
        this.interoProcess.stdin.on('error', this.onStdInError);
        this.interoProcess.stdin.write('\n');
    }
    /**
     * End of transmission utf8 char
     */
    static get EOTUtf8() {
        return '\u0004';
        //return '@';
    }
    /**
     * End of transmission char in CMD
     */
    static get EOTInteroCmd() {
        return '"\\4"';
        //return '@';
    }
    /**
     * Send a request to intero
     */
    sendRawRequest(rawRequest) {
        if (!this.isInteroProcessUp) {
            return Promise.reject(this.errorMsg);
        }
        let executor = (resolve, reject) => {
            let req = rawRequest + '\n';
            this.interoProcess.stdin.write(req);
            this.onRawResponseQueue.push({ resolve: resolve, reject: reject });
            debugUtils_1.DebugUtils.instance.log('>>> ' + req);
        };
        return new Promise(executor);
    }
    /**
     * Kill the underlying intero process
     */
    kill() {
        this.interoProcess.removeAllListeners();
        this.interoProcess.stdout.removeAllListeners();
        this.interoProcess.stderr.removeAllListeners();
        this.interoProcess.stdin.removeAllListeners();
        this.onRawResponseQueue.forEach(resolver => {
            resolver.reject("Intero process killed by Haskero");
        });
        this.interoProcess.kill();
        this.onRawResponseQueue = [];
        this.responseReader = null;
        this.isInteroProcessUp = false;
    }
}
exports.InteroProxy = InteroProxy;
//# sourceMappingURL=interoProxy.js.map