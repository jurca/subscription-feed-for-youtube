
import gapi from "gapi";

/**
 * API key, used mostly for accessing the public information available through
 * the YouTube data APIs.
 */
const API_KEY = "AIzaSyAEHCRhBYfgwETwFCpbIU6aedE0tzDx5Ac";

/**
 * Promise resolved when the YouTube data API (v3) has been loaded.
 *
 * @type {Promise}
 */
const apiLoadPromise = new Promise((resolve, reject) => {
  gapi.load("client", {
    callback: (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(gapi);
      }
    }
  });
}).then(() => {
  gapi.client.setApiKey(API_KEY);
  return gapi.client.load("youtube", "v3");
});

/**
 * Simple accessor to the YouTube scope of Google API. It is recommended to
 * never use multiple instances with different OAuth2 tokens simultaneously in
 * the same page, unless the previous instance is discarded first with all
 * pending requests finished.
 */
export default class GapiClient {
  /**
   * Initializes the Google API client.
   */
  constructor() {
  }

  /**
   * Checks whether OAuth2 authorization is currently possible (the user is
   * signed in to the browser).
   *
   * @return {boolean} {@code true} if OAuth2 authorization is possible.
   */
  async isAuthorizationPossible(): boolean {
    return new Promise((resolve, reject) => {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (userInfo) {
          resolve(!!userInfo.id);
        } else {
          reject(new Error(chrome.runtime.lastError));
        }
      });
    });
  }

  /**
   * Performs OAuth2 authorization process. The method returns an authorization
   * details object, which has the following fields:
   * - token: string - the generated OAuth2 token
   * - account: Object
   *   - id: string - user account ID (obfuscated gaia ID)
   *   - email: string - user's email address
   *
   * @param {?string=} accountId ID of the account for which a token should be
   *        retrieved, or {@code null} if the token should be retrieved for the
   *        primary account (or when new account is being added).
   * @param {boolean=} interactive Set to {@code false} if the authorization
   *        should happen silently without user interaction, set to
   *        {@code true} for interactive mode.
   * @return {Object} Authorization details.
   * @throws {Error} Thrown if the authorization fails.
   */
  async authorize(accountId = null, interactive: boolean = true): Object {
    let token = await (new Promise((resolve, reject) => {
      let params = {
        interactive: interactive
      };
      if (typeof accountId === "string") {
        params[account] = {
          id: accountId
        };
      }

      chrome.identity.getAuthToken(params, (token) => {
        if (typeof token === "string") {
          resolve(token);
        } else {
          reject(new Error(chrome.runtime.lastError.message));
        }
      });
    }));

    return new Promise((resolve, reject) => {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (userInfo) {
          resolve({
            token: token,
            account: userInfo
          });
        } else {
          reject(new Error(chrome.runtime.lastError));
        }
      });
    });
  }

  /**
   * Returns the currently used OAuth2 token.
   *
   * @return {Object} The currently used OAuth2 token.
   */
  get token(): Object {
    return gapi.auth.getToken();
  }

  /**
   * Sets the OAuth2 token for accessing the private information.
   *
   * @param {string|Object} token The OAuth2 token.
   */
  set token(token) {
    if (typeof token === "string") {
      token = {
        access_token: token,
        expires_in: "3600",
        state: SCOPES
      };
    }

    if (!(token instanceof Object)) {
      throw new TypeError(`The token must be an object or a string, ${token}` +
          " provided");
    }
    gapi.auth.setToken(token);
  }

  /**
   * Returns the YouTube API accessor.
   *
   * @return {Object} The YouTube API accessor.
   */
  async getYouTubeAPI(): Object {
    await apiLoadPromise;
    return gapi.client.youtube;
  }
}
