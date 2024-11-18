import type { ILogger } from "./logger";
import type { OAuthProvider } from "./oauth";
import { deleteRecords } from "./delete";
import * as nock from "nock";

import {
  SOBJECT_API_PATH,
  authProviderUrl,
  mockAuthProvider,
  mockLogger,
} from "./constants.test";
import { SResult } from "./models";

describe("REST API: delete", () => {
  let logger: ILogger;
  let authProvider: OAuthProvider;

  beforeEach(() => {
    jest.resetAllMocks();
    nock.cleanAll();

    logger = mockLogger();
    authProvider = mockAuthProvider();
  });

  it("deletes 3 records", async () => {
    const result1 = Object.freeze({
      id: "abc123",
      success: true,
    });

    const result2 = Object.freeze({
      id: "xyz123",
      success: true,
    });

    const result3 = Object.freeze({
      id: "fgh458",
      success: true,
    });

    const idStringEncoded = "abc123%2Cxyz123%2Cfgh458";

    nock(authProviderUrl)
      .delete(`${SOBJECT_API_PATH}?ids=${idStringEncoded}&allOrNone=false`)
      .reply(
        200,
        {
          data: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    await expect(
      deleteRecords(logger, authProvider, ["abc123", "xyz123", "fgh458"], {
        allOrNone: false,
      }),
    ).resolves.toEqual({ data: [result1, result2, result3] });
  });

  it("should delete 200 IDs", async () => {
    const idsToDelete: string[] = [];
    const expectedDeletionResults: SResult[] = [];
    let idStringEncoded = "";

    for (let i = 0; i < 200; i++) {
      const id = `id_${i}`;
      idsToDelete.push(id);
      expectedDeletionResults.push({
        id,
        success: true,
      });

      idStringEncoded += `${id}${i < 199 ? "%2C" : ""}`;
    }

    nock(authProviderUrl)
      .delete(`${SOBJECT_API_PATH}?ids=${idStringEncoded}&allOrNone=false`)
      .reply(
        200,
        {
          data: expectedDeletionResults,
        },
        {
          "Content-Type": "application/json",
        },
      );

    await expect(
      deleteRecords(logger, authProvider, idsToDelete, {
        allOrNone: false,
      }),
    ).resolves.toEqual({ data: expectedDeletionResults });
  });

  it("should throw for more than 200 IDs", async () => {
    const idsToDelete = Array.from(
      { length: 201 },
      (_, i) => "id_" + i.toString(),
    );

    await expect(
      deleteRecords(logger, authProvider, idsToDelete, {
        allOrNone: false,
      }),
    ).rejects.toThrow("Cannot delete more than 200 records at a time");
  });

  it("should return empty array for 0 IDs", async () => {
    await expect(
      deleteRecords(logger, authProvider, [], {
        allOrNone: false,
      }),
    ).resolves.toEqual([]);
  });

  it("server returns null", async () => {
    const idStringEncoded = "abc123%2Cxyz123";

    nock(authProviderUrl)
      .delete(`${SOBJECT_API_PATH}?ids=${idStringEncoded}&allOrNone=false`)
      .reply(200, "null", {
        "Content-Type": "application/json",
      });

    await expect(
      deleteRecords(logger, authProvider, ["abc123", "xyz123"], {
        allOrNone: false,
      }),
    ).resolves.toEqual([]);
  });

  it("should bubble up any errors", async () => {
    const idStringEncoded = "abc123";

    nock(authProviderUrl)
      .delete(`${SOBJECT_API_PATH}?ids=${idStringEncoded}&allOrNone=false`)
      .replyWithError("api error");

    await expect(
      deleteRecords(logger, authProvider, ["abc123"]),
    ).rejects.toThrow("api error");
  });

  it("should throw for 500 errors", async () => {
    const idStringEncoded = "abc123%2Cxyz123";

    nock(authProviderUrl)
      .delete(`${SOBJECT_API_PATH}?ids=${idStringEncoded}&allOrNone=false`)
      .reply(500, "null", {
        "Content-Type": "application/json",
      });

    await expect(
      deleteRecords(logger, authProvider, ["abc123", "xyz123"], {
        allOrNone: false,
      }),
    ).rejects.toThrow("Request failed with status code 500");
  });

  it("logger is not required", async () => {
    // setup
    const result1 = Object.freeze({
      id: "abc123",
      success: true,
    });

    const idStringEncoded = "abc123";

    nock(authProviderUrl)
      .delete(`${SOBJECT_API_PATH}?ids=${idStringEncoded}&allOrNone=false`)
      .reply(200, { data: [result1] }, { "Content-Type": "application/json" });

    const logger = undefined;
    await expect(
      deleteRecords(logger, authProvider, ["abc123"], {
        allOrNone: false,
      }),
    ).resolves.toEqual({ data: [result1] });
  });
});
