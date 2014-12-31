
/**
 * Simple chrome localization API wrapper.
 */
export default class L10n {
  get(key: string, ...substitutions: Array<string>): string {
    return L10n.get(key, substitutions);
  }

  /**
   * Retrieves the specified localization message.
   *
   * @param {string} key Localization message identifier.
   * @param {string[]} substitutions The substitutions for message
   *        placeholders.
   * @return {string} The localization message.
   * @throw {Error} Thrown if more than 9 placeholder substitutions are
   *        provided.
   */
  static get(key: string, ...substitutions: Array<string>): string {
    if (substitutions.length > 9) {
      throw new Error("Too many substitutions provided: " +
          substitutions.join());
    }

    return chrome.i18n.getMessage(key, substitutions);
  }
}
