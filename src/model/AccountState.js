
/**
 * Enum containing the possible states of a user's YouTube account.
 */
export default Object.freeze({
  /**
   * The account is enabled and working properly.
   */
  ACTIVE: "ACTIVE",

  /**
   * The account is currently disabled.
   */
  DISABLED: "DISABLED",

  /**
   * The access to the account is not currently authorized by the user, some
   * features may not be available.
   */
  UNAUTHORIZED: "UNAUTHORIZED",

  /**
   * The YouTube API is reporting an error related to this account.
   */
  ERROR: "ERROR"
})
