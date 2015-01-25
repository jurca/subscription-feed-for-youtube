
import angular from "angular";
import "angular-route";
import "angular-animate";
import Options from "../../controller/Options";
import Accounts from "../../controller/Accounts";
import IncognitoSubscriptions from "../../controller/IncognitoSubscriptions";
import Videos from "../../controller/Videos";
import Synchronization from "../../controller/Synchronization";

let application = angular.module("application", ["ngRoute", "ngAnimate"]);

application.config(["$routeProvider", ($routeProvider) => {
  $routeProvider.when("/accounts", {
    templateUrl: "options/accounts.html",
    controller: "Accounts",
    controllerAs: "controller"
  }).
  when("/videos", {
    templateUrl: "options/videos.html",
    controller: "Videos"
  }).
  when("/synchronization", {
    templateUrl: "options/synchronization.html",
    controller: "Synchronization"
  }).
  otherwise({
    redirectTo: "/accounts"
  });
}]);

application.controller("Options", Options);
application.controller("Accounts", Accounts);
application.controller("IncognitoSubscriptions", IncognitoSubscriptions);
application.controller("Videos", Videos);
application.controller("Synchronization", Synchronization);

angular.bootstrap(document, ["application"]);
