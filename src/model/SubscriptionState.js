
import EnumFactory from "../EnumFactory";

export default EnumFactory.create(
  /**
   * The subscription is enabled, videos are fetched from the playlist.
   */
  "ACTIVE",

  /**
   * The subscription is disabled. This is only used with incognito
   * subscriptions. The subscription state is set to ACTIVE even if the account
   * is disabled to prevent data consistency checking hell.
   */
  "DISABLED",

  /**
   * The subscription is reporting an error. This is only used with incognito
   * subscriptions.
   */
  "ERROR"
);
