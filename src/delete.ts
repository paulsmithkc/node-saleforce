import type { OAuthProvider } from "./oauth";
import type { ILogger } from "./logger";
import { SOBJECT_API_PATH } from "./constants";
import { SOptions, SResult } from "./models";
import axios from "axios";

/**
 * Given an array of IDs, delete records in Salesforce.
 *
 * @param logger logger
 * @param authProvider auth provider
 * @param idsToDelete array of IDs to delete
 * @returns results of the deletion
 * @see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_delete.htm
 */
export async function deleteRecords(
  logger: ILogger | undefined,
  authProvider: OAuthProvider,
  idsToDelete: string[],
  options?: SOptions,
  abortSignal?: AbortSignal,
): Promise<SResult[]> {
  const method = "salesforce.deleteRecords";
  const authToken: string = authProvider.accessToken;
  const baseUrl: string = authProvider.url;
  const allOrNone: boolean = !!options?.allOrNone;

  if (!idsToDelete.length) {
    return [];
  }

  if (idsToDelete.length > 200) {
    throw new Error("Cannot delete more than 200 records at a time");
  }

  const idString = idsToDelete.join(",");
  const url = `${baseUrl}${SOBJECT_API_PATH}?ids=${encodeURIComponent(
    idString,
  )}&allOrNone=${allOrNone}`;

  try {
    logger?.info?.(method, "start", { url, idsToDelete });
    const res = await axios<SResult[]>({
      method: "DELETE",
      url: url,
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
      proxy: false,
      signal: abortSignal,
    });
    const resStatus = res.status;
    const resData = res.data || [];
    logger?.info?.(method, "done", {
      url,
      idsToDelete,
      resStatus,
      resData,
    });
    return resData;
  } catch (err) {
    /* istanbul ignore next */
    logger?.error?.(method, err, {
      url,
      resStatus: err.response?.status,
      resData: err.response?.data,
    });
    throw err;
  }
}
