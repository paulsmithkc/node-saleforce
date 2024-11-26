/* eslint-disable jest/no-export */
import type { ILogger } from "./logger";
import type { OAuthProvider } from "./oauth";

export const authProviderUrl = "https://example-org.my.salesforce.com";
export const authProviderToken = "FAKE_TOKEN";
export const SALESFORCE_API_VERSION = "v57.0";
export const OAUTH_API_PATH = "/services/oauth2/token";
export const QUERY_API_PATH = "/services/data/v57.0/query";
export const SOBJECT_API_PATH = "/services/data/v57.0/composite/sobjects";

export const customType = "CustomType__c";
// export const customTypeApiPath = "/services/data/v57.0/sobjects/CustomType__c";

export function mockLogger(): ILogger {
  return {
    info: jest.fn().mockImplementation(),
    error: jest.fn().mockImplementation(),
  };
}

export function mockAuthProvider(): OAuthProvider {
  return {
    url: authProviderUrl,
    accessToken: authProviderToken,
    tokenType: "Bearer",
    apiVersion: SALESFORCE_API_VERSION,
  };
}

describe("test utils", () => {
  it("mockLogger", () => {
    const logger = mockLogger();
    expect(logger).toEqual({
      info: expect.any(Function),
      error: expect.any(Function),
    });
  });
  it("mockAuthProvider", () => {
    const authProvider = mockAuthProvider();
    expect(authProvider).toEqual({
      url: authProviderUrl,
      accessToken: authProviderToken,
      tokenType: "Bearer",
      apiVersion: SALESFORCE_API_VERSION,
    });
  });
});
