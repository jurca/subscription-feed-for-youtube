
import Subscription from "../model/Subscription";
import Database from "../storage/Database";

const URL_VALIDATOR =
    /https:\/\/www.youtube.com\/(playlist?|user\/|channel\/)[-_?a-zA-Z0-9&=]*/;

let db = new Database();

export default class IncognitoSubscriptions {
  constructor($scope) {
    // init localization
    $scope.options

    // init and load data

    /**
     * The currently loaded subscriptions.
     *
     * @type {Subscription[]}
     */
    this.subscriptions = [];

    /**
     * Set to {@code true} if the subscriptions have been loaded.
     *
     * @type {boolean}
     */
    this.subscriptionsLoaded = false;

    (async () => {
      try {
        this.subscriptions = await loadSubscriptions();
        this.subscriptionsLoaded = true;
        $scope.$apply();
      } catch (e) {
        console.error(e);
      }
    })();
  }

  async addSubscription(subscriptionUrl: string): void {
    alert(subscriptionUrl);
  }
}

IncognitoSubscriptions.$inject = ["$scope"];


/**
 * Loads the incognito YouTube subscriptions from the database.
 *
 * @return {Subscription[]} Incognito YouTube subscriptions of the user.
 */
async function loadSubscriptions(): Array {
  let connection = await db.getConnection();
  let transaction = connection.transaction(["Subscription"], "readonly");
  let storage = transaction.objectStore("Subscription");
  let cursorRequest = storage.openCursor();

  return await new Promise((resolve, reject) => {
    let subscriptions = [];

    cursorRequest.onsuccess = () => {
      let cursor = cursorRequest.result;

      while (cursor && cursor.key !== undefined) {
        let subscription = new Subscription();
        subscription.load(cursor.value);

        if (subscriptions.incognito) {
          subscriptions.push(subscription);
        }

        cursor.continue();
      }

      resolve(subscriptions);
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });
}
