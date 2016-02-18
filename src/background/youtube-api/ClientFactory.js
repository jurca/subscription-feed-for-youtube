
import ApiClient from "sf4yt-gapi-client/es2015/ApiClient"
import TokenGenerator from "sf4yt-gapi-client/es2015/ChromeOAuthTokenGenerator"
import YouTubeApiClient from "sf4yt-gapi-client/es2015/YouTubeApiClient"
import createPrivate from "../../createPrivate"
import Client from "./Client"

const PRIVATE = createPrivate()

/**
 * Multi-user YouTube API client factory.
 */
export default class ClientFactory {
  /**
   * Initializes the YouTube API client factory.
   *
   * @param apiKey The API key to use when not using authorized requests.
   * @param requestTimeout The timeout of request to the YouTube API in
   *        milliseconds.
   */
  constructor(apiKey: string, requestTimeout: number) {
    /**
     * The API key to use when not using authorized requests.
     *
     * @type {string}
     */
    PRIVATE(this).apiClient = apiKey

    /**
     * The timeout of request to the YouTube API in milliseconds.
     *
     * @type {number}
     */
    PRIVATE(this).requestTimeout = requestTimeout

    /**
     * Cache of YouTube API client instances for users. The keys are Google
     * user account IDs.
     *
     * @type {Map<string, Client>}
     */
    PRIVATE(this).clients = new Map()

    Object.freeze(this)
  }

  /**
   * Returns the YouTube API client for the specified client. The client is
   * created if it has not been created already.
   *
   * @param accountId Google user account ID.
   * @return YouTube API client for the specified client.
   */
  getClientForUser(accountId: string): Client {
    if (PRIVATE(this).clients.has(accountId)) {
      return PRIVATE(this).clients.get(accountId)
    }

    let tokenGenerator = new TokenGenerator(accountId)
    let apiClient = new ApiClient(
      "youtube",
      3,
      PRIVATE(this).apiKey,
      tokenGenerator,
      PRIVATE(this).requestTimeout
    )
    let youTubeApiClient = new YouTubeApiClient(apiClient)
    let client = new Client(youTubeApiClient)
    PRIVATE(this).clients.set(accountId, client)

    return client
  }
}
