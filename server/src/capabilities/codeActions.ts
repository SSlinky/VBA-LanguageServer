import { CodeAction, Command, Diagnostic } from "vscode-languageserver";
import { BaseDiagnostic } from "./diagnostics";
import { Services } from "../injection/services";

/**
 * This class is not designed to be referenced or instantiated directly.
 * Please use Services to get its singleton instance.
 */
export class CodeActionsRegistry {
    actionFactory: Map<string | number, (diagnostic: Diagnostic, uri: string) => Command | CodeAction | undefined> = new Map();
    private logger = Services.logger;

    getDiagnosticAction(diagnostic: Diagnostic, uri: string): Command | CodeAction | undefined {
        if (diagnostic.code && this.actionFactory.has(diagnostic.code)) {
            this.logger.debug(`Getting code action for ${diagnostic.code}`, 1);
            return this.actionFactory.get(diagnostic.code)!(diagnostic, uri);
        }
    }

    /**
     * Allows a diagnostic to lazily register its action factory when it is
     * instantiated. This means code actions for diagnostics are managed on
     * the diagnostic itself without any additional wiring up.
     */
    registerDiagnosticAction(diagnostic: BaseDiagnostic): void {
        // A diagnostic must have a code and a factory and must not already be registered.
        if (diagnostic.code && diagnostic.actionFactory && !this.actionFactory.has(diagnostic.code)) {
            this.logger.debug(`Registering code action for ${diagnostic.code}`, 1);
            this.actionFactory.set(diagnostic.code, diagnostic.actionFactory);
        }
    }
}

// Example params that are related to a diagnostic.
const onCodeActionParams = {
    "textDocument":{
        "uri":"file:///c%3A/Repos/vba-LanguageServer/sample/b.bas"
    },
    "range":{"start":{"line":4,"character":1},"end":{"line":4,"character":1}},
    "context":{
        "diagnostics":[{
            "range":{"start":{"line":4,"character":1},"end":{"line":4,"character":1}},
            "message":"Option Explicit is missing from module header.",
            "data":{"uri":"file:///c%3A/Repos/vba-LanguageServer/sample/b.bas"},
            "code":"W001",
            "severity":2
        }],
        "only":["quickfix"],
        "triggerKind":1
    }
};
