# Installation instructions

This document presents how to setup a minimal environment to use the Haskero extension.

Its target audience is new haskell devloppers who want to discover the language with an integrated IDE.
Advanced users can skip parts 1,2,3,4.

## 1 - Install stack (1.2.0 or latter)

Stack is the new defacto standard to manage haskell project dependencies and resolve build issues.
To do so, Stack manages a local and global packages library. It's backed by an online packages repository ([stackage](https://www.stackage.org/)) where it downloads packages sources.

To ensure packages used by a project are compatible, stack uses tested consistent *bundle* of packages, called Long Term Support (LTS). Each LTS has a version number.
You can install several LTS on your computer, they won't interfer (like a Docker container).
To install Stack, follow this link: [Installing stack](https://docs.haskellstack.org/en/stable/install_and_upgrade)

## 2 - Create a new Haskell project

We can use Stack to create a new project.
The `stack new my-project new-template` command creates a new project called *my-project* with the project template *new-template*.
Our new project is using a specific LTS (open the `my-project.yaml` file and look at the line `resolver: lts_used`)

See [https://docs.haskellstack.org/en/stable/GUIDE/#stack-new](https://docs.haskellstack.org/en/stable/GUIDE/#stack-new)

## 3 - Setup a newly created Haskell project

To setup our stack project, in the project folder, enter the command `stack setup`.

Our project LTS version depends on a specific GHC version. If this version is not installed globally, `stack setup` will install it locally. GHC is quite heavy (> 130mo).

See [https://docs.haskellstack.org/en/stable/GUIDE/#stack-setup](https://docs.haskellstack.org/en/stable/GUIDE/#stack-setup)

## 4 - Build the project

Setup just takes care of GHC. To download dependencies, we need to build our project. Just enter the command
> `stack build`

Build is defined in a file `my-project.cabal`.

See [https://docs.haskellstack.org/en/stable/GUIDE/#stack-build](https://docs.haskellstack.org/en/stable/GUIDE/#stack-build)

### Building targets

There are several *targets* defined in the `.cabal` file. When we enter the command `stack build` the default target *executable* is built.
If you want to build a specific target you can specify its name in the build command.
> `stack build target1 target2 ...`

## 5 - Install intero

Intero is the backend used by Haskero to retrieve haskell types informations, locations, etc.
> `stack build intero`

## 6 - Launch vscode

Here we go, all dependencies are up and we can launch vscdoe in the project folder
> `code .`