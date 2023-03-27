"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require("vscode");
const option = require("../../option");
// import * as myExtension from '../../extension';
suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');
    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
    test('path test', () => {
        assert.notStrictEqual(option.some("\"C:\\hello\\world.hs\"")
            .map(f => f.split("\\").join("\\\\"))
            .map(s => ":l " + s), option.some(`:l "C:\\\\hello\\\\world.hs"`));
    });
});
//# sourceMappingURL=extension.test.js.map