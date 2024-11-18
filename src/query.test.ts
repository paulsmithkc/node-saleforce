import type { ILogger } from "./logger";
import type { OAuthProvider } from "./oauth";
import { query, trimSoqlQuery } from "./query";
import { iteratorToArray } from "./iteratorToArray";
import * as nock from "nock";
import {
  SOBJECT_API_PATH,
  QUERY_API_PATH,
  authProviderUrl,
  mockAuthProvider,
  mockLogger,
} from "./constants.test";

const recordType = "CustomType__c";
const recordId1 = "RECORD1";
const recordId2 = "RECORD2";
const recordId3 = "RECORD3";

type ExampleRecord = {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
  File_Name__c?: string;
};

const result1: ExampleRecord = Object.freeze({
  attributes: {
    type: recordType,
    url: `${SOBJECT_API_PATH}/${recordType}/${recordId1}`,
  },
  Id: recordId1,
  File_Name__c: "record1.jpeg",
});
const result2: ExampleRecord = Object.freeze({
  attributes: {
    type: recordType,
    url: `${SOBJECT_API_PATH}/${recordType}/${recordId2}`,
  },
  Id: recordId2,
  File_Name__c: "record2.jpeg",
});
const result3: ExampleRecord = Object.freeze({
  attributes: {
    type: recordType,
    url: `${SOBJECT_API_PATH}/${recordType}/${recordId3}`,
  },
  Id: recordId3,
  File_Name__c: "record3.jpeg",
});

describe("REST API: query", () => {
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

  it("select 3 records", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 3
		`);

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 3,
          done: true,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql);
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toEqual([result1, result2, result3]);
  });

  it("select 1000 records", async () => {
    // setup
    const soql = trimSoqlQuery(`
		  SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate DESC
			LIMIT 1000
		`);

    const totalSize = 1000;
    let count = 0;

    for (let pageNumber = 0; count < totalSize; ++pageNumber) {
      // generate a page of 10 to 100 records
      const pageSize = Math.min(totalSize - count, 10 + Math.random() * 90);
      const pageRecords: ExampleRecord[] = [];
      for (let i = 0; i < pageSize; ++i) {
        const recordId = count.toString();
        pageRecords.push({
          attributes: {
            type: recordType,
            url: `${SOBJECT_API_PATH}/${recordType}/${recordId}`,
          },
          Id: recordId,
          File_Name__c: `record${recordId}.jpg`,
        });
        ++count;
      }

      // mock page result
      nock(authProviderUrl)
        .get(
          pageNumber === 0
            ? `${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`
            : `${QUERY_API_PATH}/page-${pageNumber}`,
        )
        .reply(
          200,
          {
            totalSize,
            done: count >= totalSize,
            nextRecordsUrl: `${QUERY_API_PATH}/page-${pageNumber + 1}`,
            records: pageRecords,
          },
          {
            "Content-Type": "application/json",
          },
        );
    }

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql);
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(1000);
  });

  it("invalid soql query", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
		  FROM FAKE_TEST_OBJECT
			ORDER BY CreatedDate ASC
			LIMIT 10
		`);

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        400,
        [
          {
            errorCode: "INVALID_TYPE",
            message: `sObject type 'FAKE_TEST_OBJECT' is not supported. If you are attempting to use a custom object, be sure to append the '__c' after the entity name.`,
          },
        ],
        {
          "Content-Type": "application/json",
        },
      );

    // do & assert
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql);
    await expect(() => iteratorToArray(resultsItr)).rejects.toThrow(
      "Request failed with status code 400",
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: "AxiosError",
        message: "Request failed with status code 400",
        response: expect.objectContaining({
          status: 400,
          data: [
            {
              errorCode: "INVALID_TYPE",
              message: expect.stringContaining(
                `sObject type 'FAKE_TEST_OBJECT' is not supported. If you are attempting to use a custom object, be sure to append the '__c' after the entity name.`,
              ),
            },
          ],
        }),
      }),
      expect.any(Object),
    );
  });

  it("server returns null", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 3
		`);

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(200, "null", {
        "Content-Type": "application/json",
      });

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql);
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toEqual([]);
  });

  it("logger is not required", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 3
		`);

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 3,
          done: true,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    // do
    const logger = undefined;
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql);
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(3);
  });

  it("abortSignal aborted before query starts w/ allowPartial=true", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 3
		`);

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 3,
          done: true,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    abortController.abort();

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: true,
      abortSignal,
    });
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(0);
  });

  it("abortSignal aborted before query starts w/ allowPartial=false", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			ORDER BY CreatedDate
			LIMIT 3
		`);

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 3,
          done: true,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    abortController.abort();

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: false,
      abortSignal,
    });
    await expect(iteratorToArray(resultsItr)).rejects.toThrow(
      expect.objectContaining({
        name: "CanceledError",
        message: "canceled",
      }),
    );
  });

  it("abortSignal aborted while fetching pages w/ allowPartial=true", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: false,
          nextRecordsUrl: `${QUERY_API_PATH}/page-1`,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}/page-1`)
      .reply(
        200,
        () => {
          abortController.abort();
          return {
            totalSize: 6,
            done: true,
            records: [result1, result2, result3],
          };
        },
        {
          "Content-Type": "application/json",
        },
      );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: true,
      abortSignal,
    });
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(3);
  });

  it("abortSignal aborted while fetching pages w/ allowPartial=false", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: false,
          nextRecordsUrl: `${QUERY_API_PATH}/page-1`,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}/page-1`)
      .reply(
        200,
        () => {
          abortController.abort();
          return {
            totalSize: 6,
            done: true,
            records: [result1, result2, result3],
          };
        },
        {
          "Content-Type": "application/json",
        },
      );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: false,
      abortSignal,
    });
    await expect(iteratorToArray(resultsItr)).rejects.toThrow(
      expect.objectContaining({
        name: "CanceledError",
        message: "canceled",
      }),
    );
  });

  it("abortSignal aborted while iterating over results w/ allowPartial=true", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: true,
          records: [result1, result2, result3, result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: true,
      abortSignal,
    });
    const resultsArray: Array<ExampleRecord> = [];
    for await (const record of resultsItr) {
      resultsArray.push(record);
      if (resultsArray.length === 3) {
        abortController.abort();
      }
    }

    // assert
    expect(resultsArray).toHaveLength(6);
  });

  it("abortSignal aborted while iterating over results w/ allowPartial=false", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: true,
          records: [result1, result2, result3, result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: false,
      abortSignal,
    });
    const resultsArray: Array<ExampleRecord> = [];
    for await (const record of resultsItr) {
      resultsArray.push(record);
      if (resultsArray.length === 3) {
        abortController.abort();
      }
    }

    // assert
    expect(resultsArray).toHaveLength(6);
  });

  it("Empty response on second page", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: false,
          nextRecordsUrl: `${QUERY_API_PATH}/page-1`,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    nock(authProviderUrl).get(`${QUERY_API_PATH}/page-1`).reply(
      200,
      {},
      {
        "Content-Type": "application/json",
      },
    );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: true,
      abortSignal,
    });
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(3);
  });

  it("Http 400 error on second page", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: false,
          nextRecordsUrl: `${QUERY_API_PATH}/page-1`,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    nock(authProviderUrl).get(`${QUERY_API_PATH}/page-1`).reply(
      400,
      { error: "BAD REQUEST" },
      {
        "Content-Type": "application/json",
      },
    );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: true,
      abortSignal,
    });
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(3);
  });

  it("Http 500 error on second page", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: false,
          nextRecordsUrl: `${QUERY_API_PATH}/page-1`,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    nock(authProviderUrl).get(`${QUERY_API_PATH}/page-1`).reply(
      500,
      { error: "INTERNAL ERROR" },
      {
        "Content-Type": "application/json",
      },
    );

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: true,
      abortSignal,
    });
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(3);
  });

  it("Network error on second page", async () => {
    // setup
    const soql = trimSoqlQuery(`
			SELECT Id, File_Name__c
			FROM ${recordType}
			ORDER BY CreatedDate
			LIMIT 6
		`);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
      .reply(
        200,
        {
          totalSize: 6,
          done: false,
          nextRecordsUrl: `${QUERY_API_PATH}/page-1`,
          records: [result1, result2, result3],
        },
        {
          "Content-Type": "application/json",
        },
      );

    nock(authProviderUrl)
      .get(`${QUERY_API_PATH}/page-1`)
      .replyWithError(new Error("Network Error"));

    // do
    const resultsItr = query<ExampleRecord>(logger, authProvider, soql, {
      allowPartial: true,
      abortSignal,
    });
    const resultsArray = await iteratorToArray(resultsItr);

    // assert
    expect(resultsArray).toHaveLength(3);
  });
});
