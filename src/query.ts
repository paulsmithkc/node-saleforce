import type { OAuthProvider } from "./oauth";
import type { ILogger } from "./logger";
import axios from "axios";

type QueryResult<T> = {
  totalSize?: number;
  done?: boolean;
  nextRecordsUrl?: string;
  records?: T[];
};

export function trimSoqlQuery(soql: string) {
  /* istanbul ignore if */
  if (!soql) {
    return "";
  }

  let trimmedSoql = soql;
  if (typeof trimmedSoql.replaceAll === "function") {
    trimmedSoql = trimmedSoql.replaceAll(/\s+/g, " ");
  }
  if (typeof trimmedSoql.trim === "function") {
    trimmedSoql = trimmedSoql.trim();
  }
  return trimmedSoql;
}

/**
 * Returns an iterator over the results of a SOQL query.
 *
 * @param logger logger
 * @param authProvider auth provider
 * @param soql soql query
 * @returns iterator over results
 * @see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
 */
export async function* query<T>(
  logger: ILogger | undefined,
  authProvider: OAuthProvider,
  soql: string,
  options?: { allowPartial?: boolean; abortSignal?: AbortSignal },
): AsyncGenerator<T> {
  const method = "salesforce.query";
  const authToken = authProvider.accessToken;
  const baseUrl = authProvider.url;
  const { allowPartial, abortSignal } = options || {};

  const trimmedSoql = trimSoqlQuery(soql);
  let url = `${baseUrl}/services/data/${authProvider.apiVersion}/query?q=${encodeURIComponent(trimmedSoql)}`;
  let done = false;

  try {
    logger?.info?.(method, "start", { url, soql, allowPartial });

    const results: T[] = [];

    // read all of the pages of results
    while (!done) {
      let res: { status?: string | number; data?: QueryResult<T> } | undefined;
      try {
        res = await axios<QueryResult<T>>({
          method: "get",
          url: url,
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: "application/json",
          },
          proxy: false,
          signal: abortSignal,
        });
      } catch (err) {
        if (allowPartial && err.name === "CanceledError") {
          res = { status: "canceled", data: { done: true } };
        } else if (allowPartial && results.length > 0) {
          /* istanbul ignore next */
          logger?.error?.(method, err, {
            url,
            soql,
            allowPartial,
            resStatus: err.response?.status,
            resData: err.response?.data,
          });
          res = { status: "error", data: { done: true } };
        } else {
          throw err;
        }
      }

      // const resStatus = res?.status;
      const resData = res?.data || {};
      // logger?.info?.(method, "query-results", {
      //   url,
      //   soql,
      //   allowPartial,
      //   resStatus,
      //   resData,
      // });

      const {
        done: resDone,
        records: resRecords,
        nextRecordsUrl: resUrl,
      } = resData;

      if (resRecords) {
        results.push(...resRecords);
      }
      if (resDone || !resUrl) {
        done = true;
      } else {
        url = `${baseUrl}${resUrl}`;
      }
    }

    // send back the results, one at a time
    for (const record of results) {
      yield record;
    }

    logger?.info?.(method, "done", { url, soql, allowPartial, done });
  } catch (err) {
    /* istanbul ignore next */
    logger?.error?.(method, err, {
      url,
      soql,
      allowPartial,
      resStatus: err.response?.status,
      resData: err.response?.data,
    });
    throw err;
  }
}
