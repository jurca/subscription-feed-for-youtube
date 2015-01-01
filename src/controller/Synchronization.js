
import L10n from "../L10n";

/**
 * Synchronization section controller for the options page.
 */
export default class Synchronization {
  /**
   * Initializes the controller.
   *
   * @param $scope The angular template scope.
   */
  constructor($scope) {
    $scope.options_synchronization_title =
        L10n.get("options_synchronization_title");
    $scope.options_synchronization_synchronize =
        L10n.get("options_synchronization_synchronize");
    $scope.options_synchronization_shortDescription =
        L10n.get("options_synchronization_shortDescription");
    $scope.options_synchronization_longDescription =
        L10n.get("options_synchronization_longDescription");
  }
}

Synchronization.$inject = ["$scope"];
