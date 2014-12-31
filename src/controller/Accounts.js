
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
    $scope.options_accounts_title = L10n.get("options_accounts_title");
    $scope.options_accounts_add = L10n.get("options_accounts_add");
    $scope.options_accounts_incognitoTitle =
        L10n.get("options_accounts_incognitoTitle");
    $scope.options_accounts_addIncognitoPlaceholder =
        L10n.get("options_accounts_addIncognitoPlaceholder");
  }
}

Accounts.$inject = ["$scope"];
