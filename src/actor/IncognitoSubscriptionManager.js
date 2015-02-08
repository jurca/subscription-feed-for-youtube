
import AbstractActor from "./AbstractActor";

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  db: Symbol("db")
});

export default class IncognitoSubscriptionManager extends AbstractActor {
  /**
   * Initializes the actor.
   */
  constructor() {
    super();

    /**
     * The database connection provider, set during the
     * {@code background.start} event.
     *
     * @type {?Database}
     */
    this[FIELDS.db] = null;
  }

  /**
   * Event handler for the {@code background.start} event. The handler sets the
   * {@code db} private field
   *
   * @param {string} event The name of the event.
   * @param {Object<string, *>} resources Map of available resources.
   */
  onBackgroundStart(event: string, resources: Object): void {
    this[FIELDS.db] = resources.database;
  }

  /**
   * Event handler for the {@code incognito-subscriptions.add-requested} event.
   *
   * @param {string} event The name of the event.
   * @param {Object} data The event data, a serialized {@codelink Subscription}
   *        model.
   * @return {string} One of the following values:
   *         - "ok" - the subscription was added.
   *         - "duplicate" - there is already such a subscription.
   * @throws {Error} Thrown if there is a communication error with the YouTube
   *         API or an unexpected fatal error occurs.
   */
  async onIncognito_subscriptionsAdd_requested(event: string,
      data: Object): string {
    console.log(event, data);
    throw new Error("yo, man!");
    return "ok";
  }
}
