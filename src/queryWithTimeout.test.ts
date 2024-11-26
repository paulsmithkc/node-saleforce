import type { ILogger } from "./logger";
import type { OAuthProvider } from "./oauth";
import { trimSoqlQuery } from "./query";
import { queryWithTimeout } from "./queryWithTimeout";
import * as nock from "nock";
import {
  SOBJECT_API_PATH,
  QUERY_API_PATH,
  authProviderUrl,
  mockAuthProvider,
  mockLogger,
} from "./_testUtils.test";

const recordType = "CustomType__c";

function randomInt() {
  Math.floor(Math.random() * 10_000)
    .toFixed(0)
    .padStart(4, "0");
}

function randomRecord() {
  const num = randomInt();
  return Object.freeze({
    attributes: {
      type: recordType,
      url: `${SOBJECT_API_PATH}/${recordType}/${num}`,
    },
    Id: num,
    File_Name__c: `${num}.jpg`,
  });
}

const soql = trimSoqlQuery(`
  SELECT Id, File_Name__c
  FROM ${recordType}
  ORDER BY CreatedDate
  LIMIT 6
`);

function mockQuery(soql: string, delay: number) {
  nock(authProviderUrl)
    .get(`${QUERY_API_PATH}?q=${encodeURIComponent(soql)}`)
    .delay(delay)
    .reply(
      200,
      {
        totalSize: 6,
        done: true,
        records: [
          randomRecord(),
          randomRecord(),
          randomRecord(),
          randomRecord(),
          randomRecord(),
          randomRecord(),
        ],
      },
      {
        "Content-Type": "application/json",
      },
    );
}

describe("REST API: queryWithTimeout", () => {
  let logger: ILogger;
  let authProvider: OAuthProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.setTimeout(15_000);
    jest.useFakeTimers();
    nock.cleanAll();

    logger = mockLogger();
    authProvider = mockAuthProvider();
  });

  it("finished before timeout", async () => {
    // setup
    mockQuery(soql, 100);

    // do
    const p = queryWithTimeout(logger, authProvider, soql, {
      allowPartial: false,
      timeoutMS: 2000,
    });
    await jest.advanceTimersByTimeAsync(100);
    const resultsArray = await p;

    // assert
    expect(resultsArray).toHaveLength(6);
  });

  it("timed out w/ partial results", async () => {
    // setup
    mockQuery(soql, 2000);

    // do
    const p = queryWithTimeout(logger, authProvider, soql, {
      allowPartial: true,
      timeoutMS: 100,
    });
    jest.advanceTimersByTime(100);
    const resultsArray = await p;

    // assert
    expect(resultsArray).toHaveLength(0);
  });

  it("timed out w/ error", async () => {
    // setup
    mockQuery(soql, 2000);

    // do
    const p = queryWithTimeout(logger, authProvider, soql, {
      allowPartial: false,
      timeoutMS: 100,
    });
    jest.advanceTimersByTime(100);
    await expect(p).rejects.toThrow(
      expect.objectContaining({
        name: "CanceledError",
        message: "canceled",
      }),
    );
  });
});
