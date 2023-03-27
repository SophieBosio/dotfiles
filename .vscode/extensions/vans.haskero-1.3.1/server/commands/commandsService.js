"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const topLevelTypeSignature_1 = require("./topLevelTypeSignature");
class CommandsService {
    /**
     * Get a command instance, ready to execute
     * @param params command parameters
     */
    static getCommandInstance(params) {
        let cmd = CommandsService.Commands.find(c => c.command === params.command);
        if (cmd) {
            return cmd.instanciate(params.arguments);
        }
        else {
            return null;
        }
    }
}
CommandsService.Commands = [
    new topLevelTypeSignature_1.TopLevelTypeSignature()
];
CommandsService.toFeaturesCommands = () => CommandsService.Commands.map(cmd => cmd.command);
exports.CommandsService = CommandsService;
//# sourceMappingURL=commandsService.js.map