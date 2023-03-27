"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tmp = require("tmp");
const fs = require("fs");
const vsrv = require("vscode-languageserver");
const documentUtils_1 = require("../utils/documentUtils");
const load_1 = require("../intero/commands/load");
const uriUtils_1 = require("../utils/uriUtils");
const showModules_1 = require("../intero/commands/showModules");
const type_1 = require("../intero/commands/type");
const debugUtils_1 = require("../debug/debugUtils");
function default_1(documents, haskeroService) {
    return (params) => __awaiter(this, void 0, void 0, function* () {
        //list modules to check for rename
        let loadedModulesPaths = yield getAndLoadMissingModules(params.textDocument.uri);
        //sourceModule : haskell source where the user asked for a rename
        if ((yield safeRename(documents, params)) === false) {
            return null;
        }
        //modules to fix are different from loaded modules
        let modulesPathToFix = [...loadedModulesPaths];
        //contains all the edits this rename involves
        let filesEdits = new Map();
        //1 - get definition site information
        let definitionDocument;
        let definitionPosition;
        {
            let sourceDocument = documents.get(params.textDocument.uri);
            let location = yield haskeroService.getDefinitionLocation(sourceDocument, params.position);
            //if we are at the defintion site
            if (location.uri === params.textDocument.uri && documentUtils_1.DocumentUtils.isPositionInRange(params.position, location.range)) {
                //intero loc-at function returns a wrong range for defintion site, the range includes the identifier and the corps of the definition
                //so we jsut take the params position instead
                definitionDocument = sourceDocument;
                definitionPosition = params.position;
            }
            else {
                //load from disk because location.uri is not necessarily opened in the editor (just opened documents are available in the TextDocuments object)
                definitionDocument = yield documentUtils_1.DocumentUtils.loadUriFromDisk(location.uri);
                definitionPosition = location.range.start;
            }
        }
        let { word: oldName, range: definitionRange } = documentUtils_1.DocumentUtils.getIdentifierAtPosition(definitionDocument, definitionPosition, documentUtils_1.NoMatchAtCursorBehaviour.LookBoth); //getTextAtRange(locationDocument, location.range);
        //2 - rename definition site oldName to newName
        let newText = renameIdentifier(definitionDocument, definitionDocument.getText(), definitionRange, params.newName);
        //create a text edit to rename the definition site
        addEdits(filesEdits, definitionDocument.uri, [vsrv.TextEdit.replace(definitionRange, params.newName)]);
        //create a tmp file for the definition file with this newname and fix all errors
        let tmpDefinitionFilePath = yield createTmpFile(newText);
        let tmpDefinitionURI = uriUtils_1.UriUtils.toUri(tmpDefinitionFilePath);
        let definitionSiteEdits = yield fixModuleFile(tmpDefinitionURI, null, oldName, params.newName); //the definition site for the definition is null
        addEdits(filesEdits, definitionDocument.uri, definitionSiteEdits);
        // remove the definition site module from the list of modules to fix
        modulesPathToFix.splice(modulesPathToFix.indexOf(uriUtils_1.UriUtils.toFilePath(definitionDocument.uri)), 1);
        //3 - fix all previously opened modules
        yield Promise.all(modulesPathToFix.map((modulePath) => __awaiter(this, void 0, void 0, function* () {
            let moduleURI = uriUtils_1.UriUtils.toUri(modulePath);
            let moduleDocument = yield documentUtils_1.DocumentUtils.loadUriFromDisk(moduleURI);
            let tmpFilePath = yield createTmpFile(moduleDocument.getText());
            let modulesEdits = yield fixModuleFile(uriUtils_1.UriUtils.toUri(tmpFilePath), tmpDefinitionURI, oldName, params.newName);
            addEdits(filesEdits, moduleURI, modulesEdits);
        })));
        //4 - unload all modules and reload previously loaded modules
        yield haskeroService.executeInteroRequest(new load_1.LoadRequest([], false));
        yield haskeroService.executeInteroRequest(new load_1.LoadRequest(loadedModulesPaths.map(uriUtils_1.UriUtils.toUri), false));
        let workSpaceEdits = { changes: {} };
        filesEdits.forEach((v, k) => {
            workSpaceEdits.changes[k] = v;
            // console.log(k);
            // v.forEach(c => console.dir(c));
        });
        return workSpaceEdits;
    });
    function getAndLoadMissingModules(sourceDocumentUri) {
        return __awaiter(this, void 0, void 0, function* () {
            let loadedModulesPaths = (yield haskeroService.executeInteroRequest(new showModules_1.ShowModulesRequest())).modules;
            //sometimes, the renameDocument where the user asks for a rename is not loaded
            //we have to load and to add it
            let sourceDocumentPath = uriUtils_1.UriUtils.toFilePath(sourceDocumentUri);
            if (!loadedModulesPaths.some(m => m === sourceDocumentPath)) {
                yield haskeroService.executeInteroRequest(new load_1.LoadRequest([sourceDocumentUri], false));
                loadedModulesPaths.push(sourceDocumentPath);
            }
            return loadedModulesPaths;
        });
    }
    /**
     * Returns true if it's safe to rename, false otherwise
     * Abord rename if
     *  - we try to rename a Type
     *  - the new name allready exists
     */
    function safeRename(documents, params) {
        return __awaiter(this, void 0, void 0, function* () {
            let isTypeDefinition = /^[A-Z].*/;
            let sourceDocument = documents.get(params.textDocument.uri);
            let nameToChange = documentUtils_1.DocumentUtils.getIdentifierAtPosition(sourceDocument, params.position, documentUtils_1.NoMatchAtCursorBehaviour.LookBoth).word;
            let typeResponse = yield haskeroService.executeInteroRequest(new type_1.TypeRequest(params.newName));
            return typeResponse.identifierExists === false && !isTypeDefinition.test(nameToChange);
        });
    }
    function addEdits(filesEdits, uri, edits) {
        let es = filesEdits.get(uri);
        if (!es) {
            es = [];
            filesEdits.set(uri, es);
        }
        es.push(...edits);
    }
    function fixModuleFile(uri, uriDefinitionModule, oldName, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            let filePath = uriUtils_1.UriUtils.toFilePath(uri);
            let document = yield documentUtils_1.DocumentUtils.loadUriFromDisk(uri);
            let newText = document.getText();
            let uris = uriDefinitionModule ? [uri, uriDefinitionModule] : [uri];
            // console.log("uris :" + uris);
            let loadResponse = yield haskeroService.executeInteroRequest(new load_1.LoadRequest(uris, true));
            let oldNameErrors = loadResponse.errors.filter(e => e.filePath === filePath && e.message.indexOf(oldName) > -1);
            let edits = new Array();
            // console.log("errors in : " + uri);
            // console.dir(loadResponse.errors);
            if (oldNameErrors.length > 0) {
                edits = oldNameErrors
                    .reverse() //starting from the end, its a trick to rename identifier from the end in order avoid shifts when renaming with a new identifier with different length
                    .map(e => {
                    let range = errorToRange(document, e);
                    newText = renameIdentifier(document, newText, range, newName);
                    return vsrv.TextEdit.replace(range, newName);
                });
                yield saveNewTextForDocument(document, newText);
                edits.push(...yield fixModuleFile(uri, uriDefinitionModule, oldName, newName));
            }
            else {
                // console.log("------------");
                //console.log(newText);
            }
            return edits;
        });
    }
    function saveNewTextForDocument(document, newText) {
        return __awaiter(this, void 0, void 0, function* () {
            let path = uriUtils_1.UriUtils.toFilePath(document.uri);
            return new Promise((resolve, reject) => {
                let stream = fs.createWriteStream(path);
                stream.on('finish', () => {
                    resolve();
                });
                stream.on('error', reason => reject(reason));
                stream.write(newText);
                stream.end();
                stream.close();
            });
        });
    }
    function errorToRange(document, error) {
        //position in error message are 1 based. Position are 0 based, but there is a issue somewhere because it works without (-1) :-(
        let identifier = documentUtils_1.DocumentUtils.getIdentifierAtPosition(document, vsrv.Position.create(error.line, error.col), documentUtils_1.NoMatchAtCursorBehaviour.LookBoth);
        return identifier.range;
    }
    function renameIdentifier(document, text, range, newName) {
        let startingOffset = document.offsetAt(range.start);
        let endingOffset = document.offsetAt(range.end);
        //Array(wordSpot.word.length + 1).join("-")
        return text.substr(0, startingOffset) + newName + text.substr(endingOffset, text.length - endingOffset);
    }
    function createTmpFile(content) {
        return new Promise((resolve, reject) => {
            tmp.file({ prefix: 'haskero-', postfix: '.hs' }, (err, path, fd, cleanUpFct) => {
                debugUtils_1.DebugUtils.instance.log("Creating tmp file for the renaming process: " + path);
                let tmpStream = fs.createWriteStream(path);
                tmpStream.on('finish', () => {
                    resolve(path);
                });
                tmpStream.on('error', reason => reject(reason));
                tmpStream.write(content);
                tmpStream.end();
            });
        });
    }
}
exports.default = default_1;
//# sourceMappingURL=rename.js.map