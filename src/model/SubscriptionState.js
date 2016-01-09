
/**
 * Possible states of a subscription to a YouTube channel or playlist.
 */
export default Object.freeze({
  /**
   * The subscription is enabled, videos are fetched from the playlist.
   */
  ACTIVE: "ACTIVE",

  /**
   * The subscription is disabled. This is only used with incognito
   * subscriptions. The subscription state is set to ACTIVE even if the account
   * is disabled to prevent data consistency checking hell caused by multiple
   * account subscribing to the same channel.
   */
  DISABLED: "DISABLED",

  /**
   * The subscription is reporting an error.
   */
  ERROR: "ERROR"
})
