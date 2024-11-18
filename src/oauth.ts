import type { ILogger } from "./logger";
import { OAUTH_API_PATH } from "./constants";
import axios, { AxiosError, AxiosRequestConfig } from "axios";

export interface OAuthProvider {
  url: string;
  accessToken: string;
  tokenType: string;
}

type OAuthResult = {
  access_token: string;
  token_type: string;
  instance_url: string;
};

export async function getAuthorization(
  log: ILogger,
  secrets: {
    url: string;
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    token: string;
  },
): Promise<OAuthProvider> {
  const method = "salesforce.getAuthorization";

  const request: AxiosRequestConfig = {
    method: "post",
    url: `${secrets.url}${OAUTH_API_PATH}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: {
      grant_type: "password",
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
      username: secrets.username,
      password: secrets.password + secrets.token,
    },
    proxy: false,
  };
  log?.info?.(method, "Requesting OAuth token", { request });

  try {
    const response = await axios<OAuthResult>(request);
    const responseData = response.data;
    return {
      url: responseData.instance_url,
      accessToken: responseData.access_token,
      tokenType: responseData.token_type,
    };
  } catch (err) {
    /* istanbul ignore next */
    const response = (err as AxiosError)?.response;

    /* istanbul ignore next */
    log?.error?.(method, "Failed to obtain OAuth authorization", {
      error: {
        name: (err as Error)?.name || "Error",
        message: (err as Error)?.message || (err as string),
        stack: (err as Error)?.stack,
      },
      response: {
        status: response?.status,
        headers: response?.headers,
        data: response?.data,
      },
    });

    throw new Error(`Failed to obtain OAuth authorization.`);
  }
}
