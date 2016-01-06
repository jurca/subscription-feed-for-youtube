
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
    $scope.l10n = {
      synchronization: {
        title: L10n.get("options_synchronization_title"),
        synchronize: L10n.get("options_synchronization_synchronize"),
        shortDescription: L10n.get("options_synchronization_shortDescription"),
        longDescription: L10n.get("options_synchronization_longDescription")
      }
    };
  }
}

Synchronization.$inject = ["$scope"];
