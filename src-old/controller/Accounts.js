
import GapiClient from "../GapiClient";
import L10n from "../L10n";
import Account from "../model/Account";
import Database from "../storage/Database";

let db = new Database();

/**
 * Accounts and subscriptions management controller.
 */
export default class Accounts {
  /**
   * Initializes the controller.
   *
   * @param $scope Angular template scope.
   */
  constructor($scope) {
    // localization
    $scope.l10n = {
      accounts: {
        title: L10n.get("options_accounts_title"),
        add: L10n.get("options_accounts_add"),
        notSignedIntoBrowser:
            L10n.get("options_accounts_notSignedIntoBrowser"),
        authorizationFailed:
            L10n.get("options_accounts_authorizationFailed")
      }
    };

    // show warning if the user is not signed into Chrome
    let notSingedInMessage = angular.element("#not-signed-into-browser");
    let gapi = new GapiClient();
    setInterval(async () => {
      if (await gapi.isAuthorizationPossible()) {
        notSingedInMessage.css("height", 0);
      } else {
        let height = notSingedInMessage[0].scrollHeight;
        notSingedInMessage.css("height", `${height}px`);
      }
    }, 200);

    this.accounts = [];

    (async () => {
      try {
        this.accounts = await loadAccounts();
        $scope.$apply();
      } catch (e) {
        console.error(e);
      }
    })();
  }

  /**
   * Adds another account to the authorized YouTube accounts.
   */
  async addAccount(): void {
    let gapi = new GapiClient();
    let errorMessage = angular.element("#authorization-failed");
    try {
      let authorization = await gapi.authorize(false);
      console.log(authorization);
    } catch (error) {
      errorMessage.css("height", `${errorMessage[0].scrollHeight}px`);
      setTimeout(() => {
        errorMessage.css("height", "");
      }, 15000);
    }
  }

  /**
   * Toggles the checkbox identified by the specified ID.
   *
   * @param {string} checkboxId DOM element ID identifying the checkbox.
   */
  toggleCheckbox(checkboxId: string): void {
    let checkbox = angular.element(`#${checkboxId}`)[0];
    checkbox.checked = !checkbox.checked;
  }

  /**
   * Selects or deselects all accounts in the accounts section of the page.
   *
   * @param {string} checkboxId DOM element ID identifying the checkbox used to
   *        select all accounts.
   */
  selectAllAccounts(checkboxId: string): void {
    this.toggleCheckbox(checkboxId);

    angular.element("#accounts-list input[type='checkbox']").each(function () {
      this.checked = angular.element(`#${checkboxId}`)[0].checked;
    });
  }

  /**
   * Selects or deselects all subscriptions in the incognito subscriptions
   * section of the page.
   *
   * @param {string} checkboxId DOM element ID identifying the checkbox used to
   *        select all subscriptions.
   */
  selectAllSubscriptions(checkboxId: string): void {
    this.toggleCheckbox(checkboxId);

    let selector = "#subscriptions-list input[type='checkbox']";
    let checkboxes = angular.element(selector);
    checkboxes.each(function () {
      this.checked = angular.element(`#${checkboxId}`)[0].checked;
    });
  }
}

Accounts.$inject = ["$scope"];

/**
 * Loads the YouTube accounts of the user from the database.
 *
 * @return {Account[]} YouTube accounts of the user.
 */
async function loadAccounts(): Array {
  let connection = await db.getConnection();
  let transaction = connection.transaction(["Account"], "readonly");
  let accountsStorage = transaction.objectStore("Account");
  let cursorRequest = accountsStorage.openCursor();

  return await new Promise((resolve, reject) => {
    let accounts = [];

    cursorRequest.onsuccess = () => {
      let cursor = cursorRequest.result;

      while (cursor && cursor.key !== undefined) {
        let account = new Account();
        account.load(cursor.value);
        accounts.push(account);
        cursor.continue();
      }

      resolve(accounts);
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });
}
