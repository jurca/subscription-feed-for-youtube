
import EnumFactory from "../EnumFactory";

/**
 * Types of subscription items.
 *
 * @enum {SubscriptionType}
 */
export default EnumFactory.create(
  /**
   * A subscription to a YouTube channel.
   */
  "CHANNEL",

  /**
   * A subscription to a playlist.
   */
  "PLAYLIST"
);
