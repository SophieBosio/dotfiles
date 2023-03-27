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
exports.Server = void 0;
const http = __importStar(require("http"));
const ws_1 = __importDefault(require("ws"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const lw = __importStar(require("../lw"));
const PdfFilePathEncoder = __importStar(require("./serverlib/encodepath"));
const events_1 = require("events");
const logger_1 = require("./logger");
const pdfviewermanager_1 = require("./viewerlib/pdfviewermanager");
const logger = (0, logger_1.getLogger)('Server');
class WsServer extends ws_1.default.Server {
    constructor(server, validOrigin) {
        super({ server });
        this.validOrigin = validOrigin;
    }
    //
    // Check Origin header during WebSocket handshake.
    // - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#client_handshake_request
    // - https://github.com/websockets/ws/blob/master/doc/ws.md#servershouldhandlerequest
    //
    shouldHandle(req) {
        if (!this.validOrigin.includes('127.0.0.1')) {
            return true;
        }
        const reqOrigin = req.headers['origin'];
        if (reqOrigin !== undefined && reqOrigin !== this.validOrigin) {
            logger.log(`Origin in WebSocket upgrade request is invalid: ${JSON.stringify(req.headers)}`);
            logger.log(`Valid origin: ${this.validOrigin}`);
            return false;
        }
        else {
            return true;
        }
    }
}
const ServerStartedEvent = 'serverstarted';
class Server {
    constructor() {
        this.eventEmitter = new events_1.EventEmitter();
        this.serverStarted = new Promise((resolve) => {
            this.eventEmitter.on(ServerStartedEvent, () => resolve());
        });
        this.httpServer = this.initializeHttpServer();
        logger.log('Creating LaTeX Workshop http and websocket server.');
    }
    dispose() {
        this.httpServer.close();
    }
    get port() {
        const portNum = this.address?.port;
        if (portNum === undefined) {
            logger.log('Server port number is undefined.');
            throw new Error('Server port number is undefined.');
        }
        return portNum;
    }
    async getViewerUrl(pdfUri) {
        // viewer/viewer.js automatically requests the file to server.ts, and server.ts decodes the encoded path of PDF file.
        const origUrl = await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${lw.server.port}`, true));
        const url = origUrl.toString() + (origUrl.toString().endsWith('/') ? '' : '/') + `viewer.html?file=${PdfFilePathEncoder.encodePathWithPrefix(pdfUri)}`;
        return { url, uri: vscode.Uri.parse(url, true) };
    }
    get validOrigin() {
        if (this.validOriginUri) {
            return `${this.validOriginUri.scheme}://${this.validOriginUri.authority}`;
        }
        else {
            throw new Error('[Server] validOrigin is undefined');
        }
    }
    initializeHttpServer(hostname) {
        if (hostname) { // We must have created one.
            this.httpServer.close();
        }
        const httpServer = http.createServer((request, response) => this.handler(request, response));
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const viewerPort = configuration.get('viewer.pdf.internal.port');
        httpServer.listen(viewerPort, hostname ?? '127.0.0.1', undefined, async () => {
            const address = this.httpServer.address();
            if (address && typeof address !== 'string') {
                this.address = address;
                logger.log(`Server successfully started: ${JSON.stringify(address)} .`);
                if (hostname) {
                    logger.log(`BE AWARE: YOU ARE PUBLIC TO ${hostname} !`);
                }
                this.validOriginUri = await this.obtainValidOrigin(address.port, hostname ?? '127.0.0.1');
                logger.log(`valdOrigin is ${this.validOrigin}`);
                this.initializeWsServer(httpServer, this.validOrigin);
                this.eventEmitter.emit(ServerStartedEvent);
            }
            else {
                logger.log(`Server failed to start. Address is invalid: ${JSON.stringify(address)}`);
            }
        });
        httpServer.on('error', (err) => {
            logger.log(`Error creating LaTeX Workshop http server: ${JSON.stringify(err)} .`);
        });
        this.httpServer = httpServer;
        return httpServer;
    }
    async obtainValidOrigin(serverPort, hostname) {
        const origUrl = `http://${hostname}:${serverPort}/`;
        const uri = await vscode.env.asExternalUri(vscode.Uri.parse(origUrl, true));
        return uri;
    }
    initializeWsServer(httpServer, validOrigin) {
        if (this.wsServer) {
            this.wsServer.close();
        }
        this.wsServer = new WsServer(httpServer, validOrigin);
        this.wsServer.on('connection', (websocket) => {
            websocket.on('message', (msg) => lw.viewer.handler(websocket, msg));
            websocket.on('error', (err) => logger.log(`Error on WebSocket connection. ${JSON.stringify(err)}`));
        });
    }
    //
    // We reject cross-origin requests. The specification says "In case a server does not wish to participate in the CORS protocol,
    // ... The server is encouraged to use the 403 status in such HTTP responses."
    // - https://fetch.spec.whatwg.org/#http-requests
    // - https://fetch.spec.whatwg.org/#http-responses
    //
    checkHttpOrigin(req, response) {
        if (!this.validOrigin.includes('127.0.0.1')) {
            return true;
        }
        const reqOrigin = req.headers['origin'];
        if (reqOrigin !== undefined && reqOrigin !== this.validOrigin) {
            logger.log(`Origin in http request is invalid: ${JSON.stringify(req.headers)}`);
            logger.log(`Valid origin: ${this.validOrigin}`);
            response.writeHead(403);
            response.end();
            return false;
        }
        else {
            return true;
        }
    }
    sendOkResponse(response, content, contentType) {
        //
        // Headers to enable site isolation.
        // - https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header
        // - https://www.w3.org/TR/post-spectre-webdev/#documents-isolated
        //
        const sameOriginPolicyHeaders = {
            'Cross-Origin-Resource-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'X-Content-Type-Options': 'nosniff'
        };
        response.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': content.length,
            ...sameOriginPolicyHeaders
        });
        response.end(content);
    }
    async handler(request, response) {
        if (!request.url) {
            return;
        }
        const isValidOrigin = this.checkHttpOrigin(request, response);
        if (!isValidOrigin) {
            return;
        }
        if (PdfFilePathEncoder.hasPrefix(request.url) && !request.url.includes('viewer.html')) {
            const s = request.url.replace('/', '');
            const fileUri = PdfFilePathEncoder.decodePathWithPrefix(s);
            if (pdfviewermanager_1.viewerManager.getClientSet(fileUri) === undefined) {
                logger.log(`Invalid PDF request: ${fileUri.toString(true)}`);
                return;
            }
            try {
                const buf = await lw.lwfs.readFileAsBuffer(fileUri);
                this.sendOkResponse(response, buf, 'application/pdf');
                logger.log(`Preview PDF file: ${fileUri.toString(true)}`);
            }
            catch (e) {
                logger.logError(`Error reading PDF ${fileUri.toString(true)}`, e);
                response.writeHead(404);
                response.end();
            }
            return;
        }
        if (request.url.endsWith('/config.json')) {
            const params = lw.viewer.viewerParams();
            const content = JSON.stringify(params);
            this.sendOkResponse(response, Buffer.from(content), 'application/json');
            return;
        }
        let root;
        if (request.url.startsWith('/build/') || request.url.startsWith('/cmaps/') || request.url.startsWith('/standard_fonts/')) {
            root = path.resolve(`${lw.extensionRoot}/node_modules/pdfjs-dist`);
        }
        else if (request.url.startsWith('/out/viewer/') || request.url.startsWith('/viewer/')) {
            // For requests to /out/viewer/*.js and requests to /viewer/*.ts.
            // The latter is for debugging with sourcemap.
            root = path.resolve(lw.extensionRoot);
        }
        else {
            root = path.resolve(`${lw.extensionRoot}/viewer`);
        }
        //
        // Prevent directory traversal attack.
        // - https://en.wikipedia.org/wiki/Directory_traversal_attack
        //
        const reqFileName = path.posix.resolve('/', request.url.split('?')[0]);
        const fileName = path.resolve(root, '.' + reqFileName);
        let contentType;
        switch (path.extname(fileName)) {
            case '.html': {
                contentType = 'text/html';
                break;
            }
            case '.js': {
                contentType = 'text/javascript';
                break;
            }
            case '.css': {
                contentType = 'text/css';
                break;
            }
            case '.json': {
                contentType = 'application/json';
                break;
            }
            case '.png': {
                contentType = 'image/png';
                break;
            }
            case '.jpg': {
                contentType = 'image/jpg';
                break;
            }
            case '.gif': {
                contentType = 'image/gif';
                break;
            }
            case '.svg': {
                contentType = 'image/svg+xml';
                break;
            }
            case '.ico': {
                contentType = 'image/x-icon';
                break;
            }
            default: {
                contentType = 'application/octet-stream';
                break;
            }
        }
        fs.readFile(fileName, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    response.writeHead(404);
                }
                else {
                    response.writeHead(500);
                }
                response.end();
            }
            else {
                this.sendOkResponse(response, content, contentType);
            }
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map