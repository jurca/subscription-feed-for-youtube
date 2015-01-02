
import GapiClient from "../GapiClient";
import L10n from "../L10n";

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
    $scope.options_accounts_title = L10n.get("options_accounts_title");
    $scope.options_accounts_add = L10n.get("options_accounts_add");
    $scope.options_accounts_notSignedIntoBrowser =
        L10n.get("options_accounts_notSignedIntoBrowser");
    $scope.options_accounts_incognitoTitle =
        L10n.get("options_accounts_incognitoTitle");
    $scope.options_accounts_addIncognitoPlaceholder =
        L10n.get("options_accounts_addIncognitoPlaceholder");

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

    // publish the controller to the scope
    $scope.controller = this;
  }

  /**
   * Adds another account to the authorized YouTube accounts.
   */
  async addAccount(): void {
    let gapi = new GapiClient();
    try {
      let authorization = await gapi.authorize(false);
      console.log(authorization);
    } catch (error) {
      console.log(error);
    }
  }
}

Accounts.$inject = ["$scope"];
