# Contributing
This repository is under active development. Please ensure your contributions do not cause merge conflicts with the dev branch.

## Setup

1. Fork this repo
2. Install VS Code Extension [esBuild Problem Matchers](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers).
3. Install [Java](https://www.oracle.com/au/java/technologies/downloads/) >= 11
4. Install [NPM](https://github.com/coreybutler/nvm-windows)
5. `npm install` to install dependencies.
6. `npm run test` to build and unit test.
7. Create a `.\sample` directory as a default workspace for client debugging (or update .\\.vscode\\launch.json as preferred).
8. (Optional) Install [ANTLR4 grammar syntax support](https://marketplace.visualstudio.com/items?itemName=mike-lischke.vscode-antlr4) VS Code extension.
    Note: to debug a grammar, you'll first need to activate the extension by opening one of the *.g4 files.

To contribute, you'll need to [create a pull request from a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork).

## Debugging Language Server

* Use the Client + Server launch configuration (refer to [/.vscode/launch.json](./.vscode/launch.json)).

## Debugging Antlr Grammar

Requires the  ANTLR4 grammar syntax support extension installed. Each time you open the workspace, you'll need to open a grammar file to activate the extension.

Note the grammar file for this project can be found at /server/src/antlr/vba.g4

### Show Parse Tree

* Open the VBA file you want to debug.
* Run `Debug ANTLR4 grammar` from launch configurations.

### Debug Rule

* Open the grammar file.
* Right click a rule and choose an option from the context menu.
  * Show Railroad Diagram for Rule
  * Show ATN Graph for Rule

The grammar call graph is interesting, but not particularly useful. Generating "valid" input generates garbage.

## TextMate Snapshots

Your edits to the TextMate grammar may cause changes to the snapshot. If these changes are expected and unit tested, update the snapshot.

```
npm run tmSnapUpdate
```
