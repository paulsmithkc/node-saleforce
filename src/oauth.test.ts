import type { ILogger } from "./logger";
import { getAuthorization } from "./oauth";
import * as nock from "nock";
import { OAUTH_API_PATH, authProviderUrl } from "./constants.test";

const clientUrl = authProviderUrl;
const clientId = "CLIENT_ID";
const clientSecret = "CLIENT_SECRET";
const clientUsername = "CLIENT_USERNAME";
const clientPassword = "CLIENT_PASSWORD";
const clientToken = "CLIENT_TOKEN";
const accessToken = "ACCESS_TOKEN";

const secrets = {
  url: clientUrl,
  clientId,
  clientSecret,
  username: clientUsername,
  password: clientPassword,
  token: clientToken,
};

describe("REST API: oauth", () => {
  let logger: ILogger;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.setTimeout(15_000);
    nock.cleanAll();

    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  it("getAuthorization(): should generate access token", async () => {
    // setup
    nock(clientUrl)
      .post(OAUTH_API_PATH, {
        grant_type: "password",
        client_id: clientId,
        client_secret: clientSecret,
        username: clientUsername,
        password: clientPassword + clientToken,
      })
      .reply(
        200,
        {
          issued_at: new Date().getTime().toFixed(0),
          instance_url: authProviderUrl,
          access_token: accessToken,
          token_type: "Bearer",
          signature: "ACCESS_TOKEN_SIGNATURE",
        },
        {
          "Content-Type": "application/json",
        },
      );

    // do
    const provider = await getAuthorization(logger, secrets);

    // assert
    expect(provider).toEqual({
      url: authProviderUrl,
      accessToken: accessToken,
      tokenType: "Bearer",
    });
    expect(logger.error).toHaveBeenCalledTimes(0);
  }, 15_000);

  it("getAuthorization(): should fail if the credentials are wrong", async () => {
    // setup
    nock(clientUrl).post(OAUTH_API_PATH).reply(
      400,
      {
        error: "invalid_client_id",
        error_description: "client identifier invalid",
      },
      {
        "Content-Type": "application/json",
      },
    );

    // do & assert
    await expect(getAuthorization(logger, secrets)).rejects.toThrow(
      "Failed to obtain OAuth authorization.",
    );
    expect(logger.error).toHaveBeenCalledWith(
      "salesforce.getAuthorization",
      "Failed to obtain OAuth authorization",
      expect.any(Object),
    );
  }, 15_000);
});
