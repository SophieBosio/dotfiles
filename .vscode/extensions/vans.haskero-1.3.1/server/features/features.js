"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vsrv = require("vscode-languageserver");
const uuid = require("node-uuid");
const commandsService_1 = require("../commands/commandsService");
/**
 * Manage features activation with the language client
 */
class Features {
    constructor(connection) {
        this.connection = connection;
        this.areFeaturesRegistered = false; //false when an issue occured and haskero can't provide client features
    }
    /**
     * Enable all features on the client
     */
    registerAllFeatures() {
        if (this.areFeaturesRegistered) {
            return;
        }
        let registrationParams = {
            registrations: Features.features
        };
        this.connection.sendRequest(vsrv.RegistrationRequest.type, registrationParams)
            .then(() => {
            this.areFeaturesRegistered = true;
        }, error => {
            this.areFeaturesRegistered = false;
            console.log("error for registration request: " + error);
        });
    }
    /**
     * Disable all features on the client
     */
    unregisterAllFeatures() {
        if (!this.areFeaturesRegistered) {
            return;
        }
        let unregistrationParams = {
            unregisterations: Features.features
        };
        this.connection.sendRequest(vsrv.UnregistrationRequest.type, unregistrationParams)
            .then(() => {
            this.areFeaturesRegistered = false;
        }, error => {
            this.areFeaturesRegistered = true;
            console.log("error for unregistration request: " + error);
        });
    }
}
Features.features = [
    {
        /**
         * The id used to register the request. The id can be used to deregister
         * the request again.
         */
        id: uuid.v4(),
        method: "textDocument/hover"
    },
    {
        id: uuid.v4(),
        method: "textDocument/definition"
    },
    {
        id: uuid.v4(),
        method: "textDocument/references"
    },
    {
        id: uuid.v4(),
        method: "textDocument/completion",
        registerOptions: {
            resolveProvider: true
        }
    },
    {
        id: uuid.v4(),
        method: "textDocument/codeAction"
    },
    {
        id: uuid.v4(),
        method: "textDocument/rename"
    },
    {
        id: uuid.v4(),
        method: "workspace/executeCommand",
        registerOptions: {
            commands: commandsService_1.CommandsService.toFeaturesCommands()
        }
    }
];
exports.Features = Features;
//# sourceMappingURL=features.js.map