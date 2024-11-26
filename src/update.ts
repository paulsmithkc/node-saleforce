import type { OAuthProvider } from "./oauth";
import type { ILogger } from "./logger";
import { SObject, SResult, SOptions } from "./models";
import axios from "axios";

/**
 * Updates records in Salesforce.
 *
 * @param logger logger
 * @param authProvider auth provider
 * @param records record(s) to be updated
 * @param options options
 * @returns update results
 * @see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_update.htm
 */
export async function update<T extends SObject>(
  logger: ILogger | undefined,
  authProvider: OAuthProvider,
  records: T | T[],
  options?: SOptions,
  abortSignal?: AbortSignal,
): Promise<SResult[]> {
  const method = "salesforce.update";
  const authToken = authProvider.accessToken;
  const url = `${authProvider.url}/services/data/${authProvider.apiVersion}/composite/sobjects`;
  const metadata = { url, records, options };

  try {
    logger?.info?.(method, "start", metadata);

    const recordsEx: T[] = Array.isArray(records) ? records : [records];

    const overrideType = options?.type;
    for (const r of recordsEx) {
      // type
      if (overrideType) {
        r.attributes = { type: overrideType };
      } else if (!r.attributes?.type) {
        throw new Error("sobject type missing");
      }
      // id
      const id = r.Id || r.id;
      if (!id) {
        throw new Error("sobject id missing");
      }
    }

    const res = await axios<SResult[]>({
      method: "patch",
      url: url,
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
      data: {
        allOrNone: options?.allOrNone,
        records: recordsEx,
      },
      proxy: false,
      signal: abortSignal,
    });

    /* istanbul ignore next */
    logger?.info?.(method, "done", {
      ...metadata,
      resStatus: res?.status,
      resData: res?.data,
    });
    return res.data;
  } catch (err) {
    /* istanbul ignore next */
    logger?.error?.(method, err, {
      ...metadata,
      resStatus: err?.response?.status,
      resData: err?.response?.data,
    });
    throw err;
  }
}
