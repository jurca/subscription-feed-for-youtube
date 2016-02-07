
/**
 * Possible states of a subscription to a YouTube channel or playlist.
 *
 * @enum {string}
 */
export default Object.freeze({
  /**
   * The subscription is enabled, videos are fetched from the playlist.
   */
  ACTIVE: "ACTIVE",

  /**
   * The subscription is disabled. This is only used with incognito
   * subscriptions.
   */
  DISABLED: "DISABLED",

  /**
   * The subscription is reporting an error.
   */
  ERROR: "ERROR"
})
