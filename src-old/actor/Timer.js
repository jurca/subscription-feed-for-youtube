
import AbstractActor from "./AbstractActor";

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  minuteInterval: Symbol("minuteInterval"),
  quarterOfHourInterval: Symbol("quarterOfHourInterval"),
  hourInterval: Symbol("hourInterval")
});

/**
 * Timer actor, generating heartbeat events:
 *
 * - {@code "heartbeat.minute"}
 * - {@code "heartbeat.quarter-of-hour"}
 * - {@code "heartbeat.hour"}
 */
export default class Timer extends AbstractActor {
  /**
   * Initializes the actor.
   */
  constructor() {
    super();

    /**
     * ID of the interval invoked once a minute.
     *
     * @type {?number}
     */
    this[FIELDS.minuteInterval] = null;

    /**
     * ID of the interval invoked once a quarter of an hour.
     *
     * @type {?number}
     */
    this[FIELDS.quarterOfHourInterval] = null;

    /**
     * ID of the interval invoked once an hour.
     *
     * @type {?number}
     */
    this[FIELDS.hourInterval] = null;
  }

  /**
   * Event handler for the {@code "background.start"} event.
   */
  onBackgroundStart() {
    let start = Date.now();

    this[FIELDS.minuteInterval] = setInterval(() => {
      this.tell("heartbeat.minute", Date.now() - start);
    }, 60 * 1000);

    this[FIELDS.quarterOfHourInterval] = setInterval(() => {
      this.tell("heartbeat.quarter-of-hour", Date.now() - start);
    }, 15 * 60 * 1000);

    this[FIELDS.hourInterval] = setInterval(() => {
      this.tell("heartbeat.hour", Date.now() - start);
    }, 60 * 60 * 1000);
  }

  /**
   * Event handler for the {@code "background.end"} event.
   */
  onBackgroundEnd() {
    clearInterval(this[FIELDS.minuteInterval]);
    clearInterval(this[FIELDS.quarterOfHourInterval]);
    clearInterval(this[FIELDS.hourInterval]);

    this[FIELDS.minuteInterval] = null;
    this[FIELDS.quarterOfHourInterval] = null;
    this[FIELDS.hourInterval] = null;
  }
}
