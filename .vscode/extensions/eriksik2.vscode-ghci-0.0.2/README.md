# Integrated Haskell Shell

This extension integrates ghci (the interactive Haskell shell) with Visual Studio Code. This allows for auto-reloading on file change and more.

## How to use
To open an interactive shell, simply right click in your Haskell source file and click on `Open interactive shell`. Alternatively click the yellowish/orange Haskell logo in the top right corner of the editor to open/close the interactive shell, or just type the commands into the command palette.

The shell runs in the vscode integrated terminal and automatically switches when you change the current file. To close the shell you can close it as you would any other terminal window by clicking the little trash can, or you can of course type `:quit` into it.

## Commands
* `Haskell: Open interactive shell` -- Open an interactive shell with the current file loaded.
* `Haskell: Close interactive shell` -- Close the shell tied to the current file.
* `Haskell: Toggle interactive shell` -- Self explanatory.

## Requirements
Requires ghci to be installed. It probably is already if you use Haskell. If it's not and you don't know where to start the best place is probably [haskell.org/downloads](https://www.haskell.org/downloads/).

> Note: Depending on how you may have installed ghci, you might have to modify the `haskellShell.ghci.executablePath` setting in your vscode configuration file.


## Known Issues
* There are issues but I don't know about them.

## Possible additions and changes

* Find a way to decouple the interactive shell from the vscode integrated terminal, so that the user can have a shell and a terminal open at the same time. I've thought about maybe using webviews, however this could be bad for performance and probably not worth the complexity.
* I want to add the ability to open a shell that is tied to multiple files. I don't know how this would be implemented design-wise.



## Release History
### 0.0.2
- Change: Smaller icons.
- Change: No longer clear interactive shell every time file is saved.
- Fix: Files with spaces in their absolute path couldn't be opened in the interactive shell.
### 0.0.1
- Initial release
