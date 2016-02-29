
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
   * The subscription is disabled (either this is a disabled incognito
   * subscription, or the Google account has been disabled).
   */
  DISABLED: "DISABLED",

  /**
   * The subscription is enabled, but reporting an error.
   */
  ERROR: "ERROR"
})
