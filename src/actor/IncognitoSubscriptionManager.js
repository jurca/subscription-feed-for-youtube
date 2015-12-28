
import AbstractActor from "./AbstractActor";
import Subscription from "../model/Subscription";
import SubscriptionType from "../model/SubscriptionType";

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
   * @param {Object} subscription The event data, a serialized
   *        {@codelink Subscription} model.
   * @return {string} One of the following values:
   *         - "ok" - the subscription was added.
   *         - "duplicate" - there is already such a subscription.
   * @throws {Error} Thrown if there is a communication error with the YouTube
   *         API or an unexpected fatal error occurs.
   */
  async onIncognito_subscriptionsAdd_requested(event: string,
      subscription: Object): string {
    // check that the incognito subscription does not exist already
    let db = await this[FIELDS.db].getConnection();
    let transaction = db.transaction(["Subscription"], "readwrite");
    let subscriptionObjectStore = transaction.objectStore("Subscription");

    let isPresent = await new Promise((resolve, reject) => {
      let cursorRequest = subscriptionObjectStore.openCursor();
      cursorRequest.onsuccess = (event) => {
        let cursor = cursorRequest.result;
        if (!cursor) {
          resolve(false);
        }

        let otherSubscription = cursor.value;
        let isMatching =
          otherSubscription.incognito &&
          otherSubscription.type === subscription.type &&
          otherSubscription.playlist === subscription.playlist;

        if (!isMatching) {
          cursor.continue();
          return;
        }

        resolve(true);
      };
    });
    if (isPresent) {
      return "duplicate";
    }

    // TODO: get from DB or retrive from REST API the playlist/channel record
    // and update it

    await new Promise((resolve, reject) => {
      let additionRequest = subscriptionObjectStore.add(subscription);
      additionRequest.onsuccess = () => {
        transaction.oncomplete = resolve;
      };
    });

    return "ok";
  }
}
