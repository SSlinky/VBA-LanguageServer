# Contributing
**Signed commits are turned on for this repo.**

## Setup

1. Fork this repo
2. Install Java >= 11
3. Install NPM
4. `npm install` to install dependencies.
5. `npm run textMate` first time and every time grammar is changed.
6. `npm run antlr4ng` first time and every time grammar is changed.
7. (Optional) Install [ANTLR4 grammar syntax support](https://marketplace.visualstudio.com/items?itemName=mike-lischke.vscode-antlr4) VSCode extension.

To contribute, you'll need to [create a pull request from a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork).
**Signed commits are turned on for this repo.**

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

### Run unit tests for TextMate grammar

`npm run tmUnitTest`