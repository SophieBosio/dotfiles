const vscode = require("vscode");

/**
 * Return a list of all aliases and their corresponding terms from a document
 * @param {vscode.TextDocument} document 
 */
function findAllAliases(document) {
    const text = document.getText();
    const aliasRegexp = /let\s([\w0-9_]+)\s+=\s+(.+)/g;
    const matches = text.matchAll(aliasRegexp);
    return [...matches].map(match => {
        return {
            name: match[1],
            value: match[2]
        }
    });
}

/**
 * Register auto-completion handlers for the current Elsa context
 * @param {vscode.ExtensionContext} context The context within which Elsa is activated
 */
module.exports.activate = function(context) {
    /**
     * @type {vscode.CompletionItemProvider}
     */
    const aliasCompletionProvider = {
        provideCompletionItems(document, position, token, context) {
            const aliases = findAllAliases(document);
            const full = aliases.map(alias => {
                const snippet = new vscode.CompletionItem(alias.name + " (expand) ");
                snippet.insertText = `(${alias.value}) `;
                return snippet;
            });
            const name = aliases.map(alias => new vscode.CompletionItem(alias.name));
            return name.concat(full);
        }
    };
    let disposable = vscode.languages.registerCompletionItemProvider("elsa", aliasCompletionProvider);
    context.subscriptions.push(disposable);
}