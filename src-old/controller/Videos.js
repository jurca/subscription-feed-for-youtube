
import L10n from "../L10n";

/**
 * Controller for the Video feed section in the options page.
 */
export default class Videos {
  /**
   * Initializes the controller.
   *
   * @param $scope The angular template scope.
   */
  constructor($scope) {
    $scope.l10n = {
      videos: {
        title: L10n.get("options_videos_title"),
        showWatched: L10n.get("options_videos_showWatched")
      }
    };
  }
}

Videos.$inject = ["$scope"];
