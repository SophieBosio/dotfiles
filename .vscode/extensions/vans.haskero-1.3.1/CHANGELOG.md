## Release 1.3.0

 - **new feature**: Rename *identifiers* (only identifiers, not Types/Class/data) in the current module and in the definition module. (issue #45)
 - **new feature**: Add codeAction support. A little bulb is displayed to add top-level type signature automaticaly. (issue #28)

## Release 1.2.0

 - **new dependency**: dependency to `jcanero.hoogle-vscode` vscode extension to add hoogle support
 - Improve type hover and insert type signatures (issue #42)
 - Optimization: type hover speed greetly improved (issue #40)

## Release 1.1.0

 - **new feature**: Select desired targets. The target selection button now opens a checkboxlist popup, it is possible to select multiple targets.
 - **new option**:  `haskero.intero.stackPath` allows the user to set the path of the *stack* executable (issue #38)
 - **new option**:  `haskero.intero.ghciOptions` allows the user to override `--ghci-options` parameters. Can be used to disable the default `-Wall` option

## Release 1.0.1

 - **new option**: option `haskero.debugMode` allows user to investigate communication between haskero and intero. (issue #41)
 - fix ordering issue with startup parameters. (issue #39)

## Release 1.0.0

Haskero is mature enought to get to the 1.0.0 release !

 - **new feature**: support type infos and modules definition info in autocompletion (issues #23 #22)
 - **new feature**: add options to configure autocompletion and intero/ghci settings (issue #32)
 - fix rare bugs when users spamed haskero with completion/hover/locat requests
 - fix a regression where .ghci files where not ignored anymore

## Release 0.3.0

 - **new feature**: support autocompletion in import (issue #21)
 - **new feature**: support autocompletion in dot notation for qualified imports (issue #4)
 - fix a minor bugs with the EOT char

## Release 0.2.2

 - **new feature**: support for chosing the cabal targets used by Haskero. Thereby, intellisense is working on test projects as well. (issue #30)
 - improve info and error messages and adding installation documentation (issue #31)

## Release 0.2.1

 - **new feature**: automatic insertion of types signature (issue #12)

## Release 0.2.0

 - **new feature**: find usage / find all reference (issue #26)
 - update readme

## Release 0.1.36

 - refactore error handling (better messages, improved feedback, add additional debug info when installation environment is broken)
 - fix issue #17 (remove build and load when executing intero)
 - fix issue #20 (support windows paths with spaces)


## Release 0.1.33

 - add dependency to extension justusadam.language-haskell
 - fix uppercase name issue causing reload button to show up everytime
 - fix issue #16 (.ghci should be ignored)