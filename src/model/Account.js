
import "moment";
import PrimaryKey from "./annotation/PrimaryKey";
import AbstractModel from "./AbstractModel";
import AccountState from "./AccountState";

/**
 * The Account represents a YouTube account of the user of this extension. This
 * model is NOT used to represent the YouTube channels the user is subscribed
 * to.
 */
@PrimaryKey("id")
export default class Account extends AbstractModel {
  /**
   * Initializes the model.
   */
  constructor() {
    super();

    /**
     * Account ID.
     *
     * @type {string}
     */
    this.id = null;

    /**
     * The name of the account.
     *
     * @type {string}
     */
    this.name = null;

    /**
     * The state of the account.
     *
     * @type {AccountState}
     */
    this.state = AccountState.ACTIVE;

    /**
     * The last error reported by the YouTube API related to this account. Set
     * to {@code null} if the account works properly.
     *
     * @type {?string}
     */
    this.lastError = null;

    /**
     * ID the of playlist that contains the watch history of the account.
     *
     * @type {string}
     */
    this.watchHistory = null;

    /**
     * The current OAuth2 token for retrieving the priviledged information.
     *
     * @type {Object}
     */
    this.oauthToken = null;

    /**
     * The timestamp of the last time the subscriptions of this account were
     * reloaded.
     *
     * @type {Moment}
     */
    this.lastUpdate = moment();
  }
}
