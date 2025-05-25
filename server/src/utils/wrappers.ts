// Core
import { CancellationToken } from 'vscode-languageserver';

// Project
import { Services } from '../injection/services';

type paramsSignature<T, P> = (params: P, token: CancellationToken) => Promise<T>;

/**
 * A wrapper to give cancellation token handling to an async client request.
 * @param fn An async function that requires cancellation token handling.
 * @param defaultValue The value to return when cancelled.
 */
export function returnDefaultOnCancelClientRequest<T, P>(fn: paramsSignature<T, P>, defaultValue: T, name: string): paramsSignature<T, P> {
    return async (params: P, token: CancellationToken): Promise<T> => {
        if (token.isCancellationRequested) {
            const msg = `Cancellation requested before start for ${name}. Returning default.`;
            Services.logger.debug(msg);
            return defaultValue;
        }

        return new Promise<T>((resolve) => {
            const onCancel = () => {
                const msg = `Cancellation requested during processing for ${name}. Returning default.`;
                Services.logger.debug(msg);
                resolve(defaultValue);
            };
            token.onCancellationRequested(onCancel);
            fn(params, token).then(resolve).catch(() => resolve(defaultValue));
            token.onCancellationRequested(() => undefined);
            Services.logger.debug(`Finished processing ${name}`);
        });
    };
}