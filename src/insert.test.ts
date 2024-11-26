import type { ILogger } from "./logger";
import type { OAuthProvider } from "./oauth";
import { insert } from "./insert";
import * as nock from "nock";
import {
  SOBJECT_API_PATH,
  authProviderUrl,
  mockAuthProvider,
  mockLogger,
  customType,
} from "./_testUtils.test";

describe("REST API: insert", () => {
  let logger: ILogger;
  let authProvider: OAuthProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.setTimeout(15_000);
    nock.cleanAll();

    logger = mockLogger();
    authProvider = mockAuthProvider();
  });

  it("insert a single record", async () => {
    // setup
    const record = Object.freeze({
      attributes: { type: customType },
      File_Name__c: "Test-Document.png",
    });
    const result = Object.freeze({
      id: "1",
      success: true,
      errors: [],
    });

    nock(authProviderUrl)
      .post(SOBJECT_API_PATH, {
        records: [record],
      })
      .reply(200, [result], { "Content-Type": "application/json" });

    // do & assert
    await expect(insert(logger, authProvider, record)).resolves.toEqual([
      result,
    ]);
  });

  it("insert multiple records", async () => {
    // setup
    const record1 = Object.freeze({
      attributes: { type: customType },
      File_Name__c: "Test-Document-1.png",
    });
    const record2 = Object.freeze({
      attributes: { type: customType },
      File_Name__c: "Test-Document-2.png",
    });
    const result1 = Object.freeze({
      id: "1",
      success: true,
      errors: [],
    });
    const result2 = Object.freeze({
      id: "2",
      success: true,
      errors: [],
    });

    nock(authProviderUrl)
      .post(SOBJECT_API_PATH, {
        records: [record1, record2],
      })
      .reply(200, [result1, result2], { "Content-Type": "application/json" });

    // do & assert
    await expect(
      insert(logger, authProvider, [record1, record2]),
    ).resolves.toEqual([result1, result2]);
  });

  it("override record type", async () => {
    // setup
    const record1 = {
      File_Name__c: "Test-Document-1.png",
    };
    const record2 = {
      File_Name__c: "Test-Document-2.png",
    };
    const result1 = Object.freeze({
      id: "1",
      success: true,
      errors: [],
    });
    const result2 = Object.freeze({
      id: "2",
      success: true,
      errors: [],
    });

    nock(authProviderUrl)
      .post(SOBJECT_API_PATH, {
        records: [
          { ...record1, attributes: { type: customType } },
          { ...record2, attributes: { type: customType } },
        ],
      })
      .reply(200, [result1, result2], { "Content-Type": "application/json" });

    // do
    await expect(
      insert(logger, authProvider, [record1, record2], {
        type: customType,
      }),
    ).resolves.toEqual([result1, result2]);

    // assert
    expect(record1).toEqual({
      ...record1,
      attributes: { type: customType },
    });
    expect(record2).toEqual({
      ...record2,
      attributes: { type: customType },
    });
  });

  it("attributes missing", async () => {
    // setup
    const record = Object.freeze({
      Name: "Test-Document.png",
    });

    // do & assert
    await expect(() => insert(logger, authProvider, [record])).rejects.toThrow(
      "sobject type missing",
    );
  });

  it("attributes.type missing", async () => {
    // setup
    const record = Object.freeze({
      attributes: {},
      Name: "Test-Document.png",
    });

    // do & assert
    await expect(() => insert(logger, authProvider, [record])).rejects.toThrow(
      "sobject type missing",
    );
  });
  it("id not allowed", async () => {
    // setup
    const record = Object.freeze({
      attributes: { type: customType },
      Id: "1",
      File_Name__c: "Test-Document.png",
    });

    // do & assert
    await expect(() => insert(logger, authProvider, [record])).rejects.toThrow(
      "sobject id not allowed",
    );
  });

  it("server returns null", async () => {
    // setup
    const record = Object.freeze({
      attributes: { type: customType },
      File_Name__c: "Test-Document.png",
    });

    nock(authProviderUrl)
      .post(SOBJECT_API_PATH, {
        records: [record],
      })
      .reply(200, "null", { "Content-Type": "application/json" });

    // do & assert
    await expect(insert(logger, authProvider, record)).resolves.toBeNull();
  });

  it("logger is not required", async () => {
    // setup
    const record = Object.freeze({
      attributes: { type: customType },
      File_Name__c: "Test-Document.png",
    });
    const result = Object.freeze({
      id: "1",
      success: true,
      errors: [],
    });

    nock(authProviderUrl)
      .post(SOBJECT_API_PATH, { records: [record] })
      .reply(200, [result], { "Content-Type": "application/json" });

    // do & assert
    const logger = undefined;
    await expect(insert(logger, authProvider, record)).resolves.toEqual([
      result,
    ]);
  });
});
