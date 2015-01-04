require(["../dist/background/Daemon"], function (DaemonModule) {
  try {
    var Daemon = DaemonModule.default;
    var daemon = new Daemon();
    daemon.start();
  } catch (error) {
    console.error("Daemon initialization failed", error, error.stack);
  }
});
