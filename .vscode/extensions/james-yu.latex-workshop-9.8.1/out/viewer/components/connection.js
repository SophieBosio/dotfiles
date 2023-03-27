export function createConnectionPort(lwApp) {
    return new WebSocketPort(lwApp);
}
export class WebSocketPort {
    constructor(lwApp) {
        this.lwApp = lwApp;
        const scheme = 'https:' === window.location.protocol ? 'wss' : 'ws';
        const path = window.location.pathname.substring(0, window.location.pathname.indexOf('viewer.html'));
        const server = `${scheme}://${window.location.hostname}:${window.location.port}${path}`;
        this.server = server;
        this.socket = new Promise((resolve, reject) => {
            const sock = new WebSocket(server);
            sock.addEventListener('open', () => {
                resolve(sock);
            });
            sock.addEventListener('error', () => reject(new Error(`Failed to connect to ${server}`)));
        });
        this.startConnectionKeeper();
    }
    startConnectionKeeper() {
        // Send packets every 30 sec to prevent the connection closed by timeout.
        const id = setInterval(async () => {
            try {
                await this.send({ type: 'ping' });
            }
            catch {
                clearInterval(id);
            }
        }, 30000);
    }
    async send(message) {
        const sock = await this.socket;
        if (sock.readyState === 1) {
            sock.send(JSON.stringify(message));
        }
    }
    async onDidReceiveMessage(cb) {
        const sock = await this.socket;
        sock.addEventListener('message', cb);
    }
    async onDidClose(cb) {
        const sock = await this.socket;
        sock.addEventListener('close', () => cb());
    }
    async onDidOpen(cb) {
        await this.socket;
        cb();
    }
}
//# sourceMappingURL=connection.js.map