'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tools for debugging logs
 */
class DebugUtils {
    /**
     * Get the singleton
     */
    static get instance() {
        return DebugUtils._instance;
    }
    /**
     * Initializes the debug environment
     */
    static init(isDebugOn, connection) {
        if (DebugUtils._instance == null) {
            DebugUtils._instance = new DebugUtils(isDebugOn, connection);
        }
    }
    constructor(isDebugOn, connection) {
        this.isDebugOn = isDebugOn;
        this.connection = connection;
    }
    /**
     * Does a connection.console.log call if debug mode is activated
     */
    connectionLog(text) {
        if (this.isDebugOn) {
            this.connection.console.log(text);
        }
    }
    /**
     * Does a console.log call if debug mode is activated
     */
    log(text) {
        if (this.isDebugOn) {
            console.log(text);
        }
    }
}
exports.DebugUtils = DebugUtils;
//# sourceMappingURL=debugUtils.js.map