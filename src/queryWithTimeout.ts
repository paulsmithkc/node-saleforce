import type { OAuthProvider } from "./oauth";
import type { ILogger } from "./logger";
import { query } from "./query";
import { iteratorToArray } from "./iteratorToArray";

export async function queryWithTimeout<T>(
  logger: ILogger | undefined,
  authProvider: OAuthProvider,
  soql: string,
  options?: { allowPartial?: boolean; timeoutMS?: number },
): Promise<Array<T>> {
  let abortController: AbortController | undefined;
  let abortSignal: AbortSignal | undefined;
  let abortTimeout: NodeJS.Timeout | undefined;

  const timeoutMS = options?.timeoutMS;
  if (timeoutMS && timeoutMS > 0) {
    abortController = new AbortController();
    abortSignal = abortController.signal;
    abortTimeout = setTimeout(() => {
      abortController?.abort();
    }, timeoutMS).unref();
  }

  try {
    const itr = await query<T>(logger, authProvider, soql, {
      allowPartial: options?.allowPartial,
      abortSignal,
    });
    return await iteratorToArray(itr);
  } finally {
    if (abortTimeout) {
      clearTimeout(abortTimeout);
    }
  }
}
