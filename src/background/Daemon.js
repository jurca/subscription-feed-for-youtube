
import EnumFactory from "../EnumFactory";
import Timer from "../actor/Timer";
import IncognitoSubscriptionManager from
    "../actor/IncognitoSubscriptionManager";
import Connector from "../background/Connector";
import ActorEventBus from "../event-bus/ActorEventBus";
import Configuration from "../storage/Configuration";
import Database from "../storage/Database";

const ACTORS = [
  Timer,
  IncognitoSubscriptionManager
];

/**
 * Daemon states enum.
 *
 * @enum {State}
 */
const State = EnumFactory.create(
  "STOPPED",
  "RUNNING"
);

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  configuration: Symbol("configuration"),
  db: Symbol("db"),
  eventBus: Symbol("eventBus"),
  state: Symbol("state")
});

/**
 * Background daemon that handled updating the database using data retrieved
 * from the YouTube data API.
 */
export default class Daemon {
  /**
   * Initializes the daemon.
   */
  constructor() {
    console.log("Daemon initialization start");

    /**
     * The current state of the daemon.
     *
     * @type {State}
     */
    this[FIELDS.state] = State.STOPPED;

    console.log("Initializing configuration");

    /**
     * Synchronized configuration provider.
     *
     * @type {Configuration}
     */
    this[FIELDS.configuration] = new Configuration();

    console.log("Initializing database");

    /**
     * Database provider.
     *
     * @type {Database}
     */
    this[FIELDS.db] = new Database();

    console.log("Initializing the event bus and actors");

    /**
     * The event bus used by actors to communicate between each other.
     *
     * @type {ActorEventBus}
     */
    this[FIELDS.eventBus] = new ActorEventBus();

    for (let actorClass of ACTORS) {
      let actor = new actorClass();
      this[FIELDS.eventBus].registerActor(actor);
    }

    console.log("Enabling connection of other views to the event bus");

    Connector.addListener(async (event, data) => {
      return await new Promise((resolve, reject) => {
        this[FIELDS.eventBus].dispatch(event, data, (response) => {
          if (response instanceof Error) {
            reject(response);
          } else {
            resolve(response);
          }
        });
      });
    });

    console.log("Daemon initialization successful");
  }

  /**
   * Starts the background daemon.
   */
  start(): void {
    if (this[FIELDS.state] === State.RUNNING) {
      throw new Error("The daemon is already running");
    }

    console.log("Starting background daemon");

    this[FIELDS.eventBus].dispatch("background.start", {
      database: this[FIELDS.db]
    });

    this[FIELDS.configuration].addChangeListener((changes) => {
      if (this[FIELDS.state] === State.RUNNING) {
        this[FIELDS.eventBus].dispatch("configuration.change", changes);
      }
    });

    this[FIELDS.state] = State.RUNNING;

    console.log("Background daemon started");
  }

  /**
   * Stops the background daemon. This method is usually used only for
   * debugging.
   */
  stop(): void {
    if (this[FIELDS.state] === State.STOPPED) {
      throw new Error("The daemon is already stopped");
    }

    console.log("Stopping the background daemon");

    this[FIELDS.eventBus].dispatch("background.end", null);

    this[FIELDS.state] = State.STOPPED;

    console.log("Background daemon stopped");
  }
}
