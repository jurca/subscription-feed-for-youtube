
import EnumFactory from "../EnumFactory";

export default EnumFactory.create(
  /**
   * The account is enabled and working properly.
   */
  "ACTIVE",

  /**
   * The account is currently disabled.
   */
  "DISABLED",

  /**
   * The YouTube API is reporting an error related to this account.
   */
  "ERROR"
);
