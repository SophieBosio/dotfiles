# Haskero, a Haskell IDE
Haskero is a full featured haskell IDE using [Intero backend](https://github.com/commercialhaskell/intero)

**Key features**

* Code Highlight and snippets (automatic dependency on [Haskell Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=justusadam.language-haskell))
* Compilation errors and warnings
* Insert type signature + yellow bulb help
* Goto definition
* Find all references
* Identifiers types on hover
* Code completion
* Rename identifier
* Switching cabal targets
* Hoogle integration (automatic dependency on [Hoogle vscode](https://marketplace.visualstudio.com/items?itemName=jcanero.hoogle-vscode))

## Installation instructions

See [installation instructions](https://gitlab.com/vannnns/haskero/blob/master/client/doc/installation.md)

## Features

### GHC Warnings and errors (on save)

**Errors on save**

![GHC Errors](https://gitlab.com/vannnns/haskero/raw/master/client/media/error-on-save.gif "GHC Errors")

**Warnings on save**

![GHC Warnings](https://gitlab.com/vannnns/haskero/raw/master/client/media/warning-on-save.gif "GHC Warnings")

### Identifier type definition

**Type definition on hover (or ctr+k,ctr+i)**

![Type definition](https://gitlab.com/vannnns/haskero/raw/master/client/media/type-at.gif "Type definition")

### Goto definition

**Goto Identifier definition (or F12)**

![Goto definition](https://gitlab.com/vannnns/haskero/raw/master/client/media/loc-at.gif "Goto definition")

### Find all references

Find all references of a symbol in the **same module** (shift+F12)

### Automatic types insertion

**Insert identifier type**

Haskero can insert any identifier type one live above.
```haskell
taxe m =
  foldl calculate (0,m) (bounds2 0 bounds)
```
with `ctrl+shift+p > haskell: Instert Type` it becomes

```haskell
taxe :: Double -> (Double, Double)
taxe m =
  foldl calculate (0,m) (bounds2 0 bounds)
```

You can associate a short cut (eg: here **ctrl+k t**):

keybindings.json (File > Preferences > Keyboard Shortcuts)
```json
{
    "key": "ctrl+k t",
    "command": "haskero.insertType",
    "when": "editorTextFocus"
}
```

An automatique code action is available for inserting types above. Set the cursor on the function definition, a small bulb appears. You can click to see all available actions.

### Switching cabal targers

Support for chosing the cabal targets used in the IDE. Thereby, intellisense is working on test projects.

To change the current target, use the status bar button "Default targets" at the bottom right.

### Rich autocompletion

Automatic completion of imports, variables, types, etc. with type and module information.

![Auto completion](https://gitlab.com/vannnns/haskero/raw/master/client/media/autocompletion.gif "Auto completion")

### Rename

Rename function identifier in the module and definition site.

**Rename doesn't work on Types, Class or data.**

To rename, press `F2`, or right click / rename.

## Settings

Haskero settings to change the default behavior or customizing intero startup parameters.

```json
{
    "haskero.intero.ignoreDotGhci": {
        "type": "boolean",
        "default": true,
        "description": "Ignore '.ghci' config files when launching intero ghci"
    },
    "haskero.intero.startupParams": {
        "type": "array",
        "default": [
            "--no-build",
            "--no-load"
        ],
        "description": "(Warning, can break Haskero behavior) Parameters sent to intero ghci"
    },
    "haskero.intero.stackPath": {
        "type": "string",
        "default": "stack",
        "description": "(Warning, can break Haskero behavior) path to the stack executable."
    },
    "haskero.intero.ghciOptions": {
        "type": "array",
        "default": [
            "-Wall"
        ],
        "description": "(Warning, can break Haskero behavior) Parameters sent to intero ghci via --ghci-options"
    },
    "haskero.maxAutoCompletionDetails": {
        "type": "number",
        "default": 100,
        "description": "Maximum autocompletion information requests sent to get type info/module in the autocompletion flow. Set to 0 to disable details info in autocompletion."
    },
    "haskero.debugMode": {
        "type": "boolean",
        "default": false,
        "description": "Active debug mode. Can slow down haskero."
    }
}
```

## Incoming improvements

- [x] Support switching cabal targets
- [x] Better auto completion (support dot notation for qualified imports, ...)
- [x] Insert identifier type one line above
- [ ] Goto definition in hackage
- [ ] Live evaluation of random haskell code in the current module scope

## Dependencies

* It works on `stack` projects only (stack 1.2.0 minimum) - see [Installing stack](https://docs.haskellstack.org/en/stable/install_and_upgrade)
* It needs intero to be installed in the stack project - see [Installing intero](https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing)
* Automatic dependency (auto install) [Haskell Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=justusadam.language-haskell)

## Feedback

### Bugs

To fill a bug, go to my gitlab repository, [open an issue](https://gitlab.com/vannnns/haskero/issues) and use the following pattern:

- Bug description :

- Observed behaviour :

- Expected behaviour :

- OS: windows | linux | macos

- Plugin **(ghc, stack, intero and haskero)** version and **VSCode** version used :

- Steps to reproduce:

1.

2.

3.

- If the issue is hard to repeat on an empty haskell project, a link to a repository containing a sample repeating the issue

### Features

To ask for a feature, check if the feature is already requested ([features](https://gitlab.com/vannnns/haskero/issues?label_name%5B%5D=Feature) on the gitlab repository).
If not, create a new issue with the *feature requested* label.

## How it works ?

For technical information, please refer to the server project [readme](https://gitlab.com/vannnns/haskero/blob/master/server/README.md)

### License
[CeCILL](LICENSE)