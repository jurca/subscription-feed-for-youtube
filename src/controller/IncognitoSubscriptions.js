
import L10n from "../L10n";
import Subscription from "../model/Subscription";
import Database from "../storage/Database";

const URL_VALIDATOR =
    /https:\/\/www.youtube.com\/(playlist?|user\/|channel\/)[-_?a-zA-Z0-9&=]*/;

let db = new Database();

export default class IncognitoSubscriptions {
  constructor($scope) {
    // init localization
    let l10nPrefix = "options_accounts_incognito_";
    $scope.l10n = {
      accounts: {
        incognito: {
          title: L10n.get(`${l10nPrefix}title`),
          addPlaceholder: L10n.get(`${l10nPrefix}addPlaceholder`),
          addingSubscription: L10n.get(`${l10nPrefix}addingSubscription`),
          apiFailure: L10n.get(`${l10nPrefix}apiFailure`),
          invalidUrl: {
            message: L10n.get(`${l10nPrefix}invalidUrl_message`),
            example1: L10n.get(`${l10nPrefix}invalidUrl_example1`),
            example2: L10n.get(`${l10nPrefix}invalidUrl_example2`),
            example3: L10n.get(`${l10nPrefix}invalidUrl_example3`)
          },
          modal: {
            close: L10n.get(`${l10nPrefix}modal_close`),
            invalidChannelUrl: {
              title: L10n.get(`${l10nPrefix}modal_invalidChannelUrl_title`),
              message: L10n.get(`${l10nPrefix}modal_invalidChannelUrl_message`)
            },
            invalidUserUrl: {
              title: L10n.get(`${l10nPrefix}modal_invalidUserUrl_title`),
              message: L10n.get(`${l10nPrefix}modal_invalidUserUrl_message`)
            },
            invalidPlaylistUrl: {
              title: L10n.get(`${l10nPrefix}modal_invalidPlaylistUrl_title`),
              message:
                  L10n.get(`${l10nPrefix}modal_invalidPlaylistUrl_message`)
            }
          }
        }
      }
    };

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
