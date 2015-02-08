
import AbstractEventBus from "../event-bus/AbstractEventBus";

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  eventBus: Symbol("eventBus")
});

/**
 * Base class of all actors, designed for use with the
 * {@codelink ActorEventBus}. While actors based on this class are compatible
 * with any event bus based on the {@codelink AbstractEventBus} class, it is
 * recommended to register them against an {@codelink ActorEventBus} instance
 * to enable declarative event listeners (see below).
 *
 * When used with the {@codelink ActorEventBus}, it is possible define event
 * listeners in a declarative way. To declare an event listener, declare a
 * public dynamic method named after the first-letter-capitalized event name
 * parts prefixed with "on". Additionally, the method may contain an underscore
 * (_), which represents a dash (-) in event name. The following example shows
 * an actor with event listeners for the
 * {@code "application.sub-system.start"} and {@code "calc.operation"} events:
 *
 * <pre>
 * export default class ExampleActor extends AbstractActor {
 *   constructor() {
 *     super();
 *   }
 *
 *   onApplicationSub_systemStart(event: string, data, callback: Function) {
 *     // event handling logic goes here
 *   }
 *
 *   async onCalcOperation(event: string, data) {
 *     let result = ...perform operation on data
 *     return result; // alternative to using callback, this can be used with
 *                    // synchronous methods too
 *   }
 * }
 * </pre>
 */
export default class AbstractActor {
  /**
   * Initializes the actor.
   */
  constructor() {
    if (this.constructor === AbstractActor) {
      throw new Error("The AbstractActor class is abstract");
    }

    this[FIELDS.eventBus] = null;
  }

  /**
   * Asynchronously dispatches the specified event with the provided data, not
   * waiting for a response.
   *
   * @param {string} event The event to dispatch.
   * @param {*} data The data to send with the event.
   */
  tell(event: string, data): void {
    setTimeout(() => {
      this[FIELDS.eventBus].dispatch(event, data);
    }, 0);
  }

  /**
   * Asynchronously sends the specified event with the provided data, resolving
   * to the first response received.
   *
   * Note that if the listener of the dispatched event responds with an
   * {@code Error} instance, this method will throw the error, considering the
   * call to be failed.
   *
   * Note that if no timeout is specified and no response is finished, the call
   * to this method will become stale and never return.
   *
   * @param {string} event The event to dispatch.
   * @param {*} data The data to send with the event.
   * @param {number} timeout Maximum time the method will wait for a response
   *        before throwing an error.
   * @return {*} The response received.
   * @throw {Error} Thrown if the event dispatching or target event listener
   *        throws an error, or the call times out.
   */
  async ask(event: string, data, timeout: number = 15000) {
    if (timeout <= 0) {
      throw new Error("The timeout must be positive");
    }

    return await new Promise((resolve, reject) => {
      setTimeout(() => {
        this[FIELDS.eventBus].dispatch(event, data, (response) => {
          if (response instanceof Error) {
            reject(response);
          } else {
            resolve(response);
          }
        });
      }, 0);

      setTimeout(() => {
        reject(new Error(`The call exceeded the timeout ${timeout} ms`));
      }, timeout);
    });
  }

  /**
   * Binds this actor to the provided event bus, or cancels the binding if a
   * {@code null} is provided. It is impossible to replace the binding to an
   * event bus without canceling the binding first.
   *
   * This method is invoked by the {@codelink ActorEventBus} automatically.
   *
   * @param {?AbstractEventBus} eventBus The event bus to bind to, or
   *        {@code null} if the binding should be canceled.
   */
  bindToEventBus(eventBus): void {
    if ((eventBus !== null) && !(eventBus instanceof AbstractEventBus)) {
      throw new TypeError("The event bus must be null or an AbstractEventBus" +
          "instance");
    }

    if (this[FIELDS.eventBus] && eventBus) {
      throw new Error("This actor is already bound to an event bus");
    }
    if (!this[FIELDS.eventBus] && !eventBus) {
      throw new Error("This actor is not bound to an event bus");
    }

    this[FIELDS.eventBus] = eventBus;
  }
}
