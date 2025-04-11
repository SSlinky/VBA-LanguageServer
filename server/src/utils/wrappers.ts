import { CancellationToken } from 'vscode-languageserver';
import { LspLogger } from './logger';
import { Logger } from '../injection/interface';
import { Services } from '../injection/services';

type signature<T, A extends any[]> = (token: CancellationToken, ...args: A) => Promise<T | void>;
type paramsSignature<T, P> = (params: P, token: CancellationToken) => Promise<T>;

/**
 * A wrapper to give cancellation token handling to an async function.
 * @param fn An async function that requires cancellation token handling.
 * @param defaultValue The value to return when cancelled.
 */
function returnDefaultOnCancel<T, A extends any[]>(fn: signature<T, A>, logger?: Logger, name?: string, defaultValue?: T, cancelError?: Error): signature<T, A> {
    return async (token: CancellationToken, ...args: A): Promise<T | void> => {
        if (token.isCancellationRequested) {
            if (logger) logger.debug(`Cancellation requested before start for ${name ?? 'unknown'}. Returning default.`);
            if (cancelError) throw cancelError;
            return defaultValue;
        }

        return new Promise<T | void>((resolve) => {
            const onCancel = () => {
                if (logger) logger.debug(`Cancellation requested during processing for ${name ?? 'unknown'}. Returning default.`);
                if (cancelError) throw cancelError;
                resolve(defaultValue);
            };
            token.onCancellationRequested(onCancel);
            fn(token, ...args).then(resolve).catch(() => resolve(defaultValue));
        });
    };
}

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