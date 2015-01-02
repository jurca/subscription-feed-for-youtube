require.config({
  paths: {
    "angular": "/bower_components/angular/angular.min",
    "angular-animate": "/bower_components/angular-animate/angular-animate.min",
    "angular-route": "/bower_components/angular-route/angular-route.min",
    "assert": "/bower_components/assert/dist/amd/assert",
    "gapi": "https://apis.google.com/js/client",
    "twitter-bootstrap": "/bower_components/bootstrap/dist/js/bootstrap.min",
    "jquery": "/bower_components/jquery/dist/jquery.min",
    "moment": "/bower_components/moment/min/moment-with-locales.min"
  },

  shim: {
    "angular": {
      deps: ["jquery"],
      exports: "angular"
    },
    "angular-animate": {
      deps: ["angular"]
    },
    "angular-route": {
      deps: ["angular"]
    },
    "gapi": {
      exports: "gapi"
    }
  }
});
