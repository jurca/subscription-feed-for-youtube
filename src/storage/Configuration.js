
/**
 * Name of the configuration item containing the value of the "show watched
 * videos" flag.
 */
const SHOW_WATCHED_VIDEOS = "showWatchedVideos";

/**
 * Name of the configuration item containing the simplified information about
 * the user's YouTube accounts.
 */
const ACCOUNTS = "accounts";

/**
 * Name of configuration item containing the simplified information about the
 * current incognito subscriptions.
 */
const INCOGNITO_SUBSCRIPTIONS = "incognitoSubscriptions";

/**
 * Accessor of the configuration and state synchronized among user's devices.
 */
export default class Configuration {
  /**
   * Initializes the configuration accessor.
   */
  constructor() {
  }

  /**
   * Retrieves or sets the "show watched videos" flag. The method retrieves the
   * flag if invoked without an argument.
   *
   * @param {?boolean} show Whether or not the watched videos should be shown,
   *        or {@code null} if the current state of the flag should be
   *        retrieved.
   * @return {boolean} The retrieved or set state of the flag.
   */
  async showWatchedVideos(show = null): boolean {
    if (show === null) {
      return await getItem(SHOW_WATCHED_VIDEOS, false);
    }

    if (typeof show !== "boolean") {
      throw new TypeError("The show flag must be a boolean or null, " +
          `${show} provided`);
    }
    return await setItem(SHOW_WATCHED_VIDEOS, show);
  }

  /**
   * Retrieves or sets the list of YouTube accounts from which to read
   * subscriptions. The method retrieves the list of YouTube accounts if
   * invoked without an argument.
   *
   * Each account is by an object with the following fields:
   * - id:string - Account ID.
   * - watchHistory: string - Watch history playlist ID.
   *
   * @param {?Object[]} accounts The accounts to set, or {@code null} if the
   *        accounts should be retrieved.
   * @return {Object[]} The retrieved or set accounts.
   */
  async accounts(accounts = null): Array<Object> {
    if (accounts === null) {
      return await getItem(ACCOUNTS, []);
    }

    if (!(accounts instanceof Array)) {
      throw new TypeError("The accounts must be an array of objects, " +
          `${accounts} provided`);
    }
    return await setItem(ACCOUNTS, accounts);
  }

  /**
   * Retrieves or sets the list of incognito subscriptions. The method
   * retrieves the list of incognito subscriptions if invoked without an
   * argument.
   *
   * Each subscription is represented by an object with the following fields:
   * - channel: boolean - {@code true} if this is a subscription to a YouTube
   *                      channel, {@code false} if this is a subscriptions to
   *                      a YouTube playlist.
   * - id: string - YouTube channel or playlist ID.
   *
   * @param {?Object[]} subscriptions The subscriptions to set, or {@code null}
   *        if the subscriptions should be retrieved.
   * @return {Object[]} The retrieved or set subscriptions.
   */
  async incognitoSubscriptions(subscriptions = null): Array<Object> {
    if (subscriptions === null) {
      return await getItem(INCOGNITO_SUBSCRIPTIONS, []);
    }

    if (!(subscriptions instanceof Array)) {
      throw new Error("The subscriptions must be an array of objects, " +
          `${subscriptions} provided`);
    }
    return await setItem(INCOGNITO_SUBSCRIPTIONS);
  }
}

/**
 * Retrieves the value of the specified configuration item.
 *
 * @param {string} item The configuration item to retrieve.
 * @param {*} defaultValue The default value to use as a result if the
 *        configuration item is not set. The value should be JSON-serializable
 *        as only JSON-serializable values can be stored as configuration item
 *        values.
 * @return {Promise<*>} Promise resolved to the retrieved configuration item
 *         value, or the provided default value if the configuration item is
 *         not set.
 */
function getItem(item: string, defaultValue): Promise {
  return new Promise((resolve, reject) => {
    chrome.storage.get(item, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError));
      } else {
        resolve(result.hasOwnProperty(item) ? result[item] : defaultValue);
      }
    });
  });
}

/**
 * Sets the specified configuration item to the provided value.
 *
 * @param {string} item The configuration item to set.
 * @param {*} value The value to set. The value must be JSON-serializable.
 * @return {Promise<*>} Promise resolved to the provided value when the
 *         configuration item is set.
 */
function setItem(item: string, value): Promise {
  return new Promise((resolve, reject) => {
    chrome.storage.set({ item: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError));
      } else {
        resolve(value);
      }
    });
  });
}
