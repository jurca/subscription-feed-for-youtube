
import angular from "angular";
import L10n from "../L10n";

/**
 * Options page main controller.
 */
export default class Options {
  /**
   * Initializes the controller.
   *
   * @param $scope Angular template scope.
   */
  constructor($scope, $location) {
    // localization
    $scope.options_pageTitle = L10n.get("options_pageTitle");
    $scope.options_title_short = L10n.get("options_title_short");
    $scope.options_title_full = L10n.get("options_title_full");
    $scope.options_menu_accounts = L10n.get("options_menu_accounts");
    $scope.options_menu_videos = L10n.get("options_menu_videos");
    $scope.options_menu_synchronization =
        L10n.get("options_menu_synchronization");

    // in case we arrived to a different sub-page than the accounts sub-page...
    if ($location.path() !== "/accounts") {
      this.switchPage($location.path().substring(1));
    }
  }

  /**
   * Handles a click on one of the menu anchors by removing the .active CSS
   * class from the previously selected menu anchor and adds it to the clicked
   * anchor (specified by the parameter).
   *
   * @param {string} selectedPage Relative URI to the page, withouth the
   *        starting bang-slash (#/).
   */
  switchPage(selectedPage: string) {
    angular.element("#main-menu a").removeClass("active");
    angular.element(`#main-menu a[href="#/${selectedPage}"]`).addClass("active");
  }
}

Options.$inject = ["$scope", "$location"];
