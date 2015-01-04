
import AbstractActor from "../actor/AbstractActor";
import AbstractEventBus from "./AbstractEventBus";

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  actors: Symbol("actors")
});

/**
 * The Actor event bus, a high-level event bus that allows communication
 * between actors.
 */
export default class ActorEventBus extends AbstractEventBus {
  /**
   * Initializes the event bus.
   */
  constructor() {
    super();

    /**
     * Map of registered actors to the listeners functions used to pass the
     * observed events to the actors and capture errors thrown by the actors.
     *
     * @type {Map<AbstractActor, function(string, *, function(*)=)[]>}
     */
    this[FIELDS.actors] = new Map();
  }

  /**
   * Registers the provided actor to the event bus.
   *
   * @param {AbstractActor} actor The actor to register.
   */
  registerActor(actor: AbstractActor): void {
    if (this[FIELDS.actors].has(actor)) {
      return;
    }

    console.log("Registering an actor", actor);

    let eventsToListenerMethods = getEventListeners(actor);
    let events = eventsToListenerMethods.keys();
    let listeners = [];

    for (let event of events) {
      let listener = async (eventName, data, callback) => {
        let method = eventsToListenerMethods.get(event);
        try {
          let response = await actor[method](eventName, data, callback);
          if (callback && (response !== undefined)) {
            callback(response);
          }
        } catch (error) {
          if (callback instanceof Function) {
            console.warn(
              `Actor event listener method ${method} threw an error`,
              error,
              error instanceof Error ? error.stack : "[stack unknown]"
            );
            callback(error);
          } else {
            console.error(
              `Actor event listener method ${method} threw an error, no ` +
                  "callback has been provided",
              error,
              error instanceof Error ? error.stack : "[stack unknown]"
            );
          }
        }
      };
      this.addListener(event, listener);
      listeners.push(listener);
    }

    actor.bindToEventBus(this);
    this[FIELDS.actors].set(actor, listeners);
    this.dispatch("event-bus.actor-registered", actor);
    console.log("Actor registered", actor);
  }

  /**
   * Unregisters the provided actor. The method has no effect if the actor is
   * not registered.
   *
   * @param {AbstractActor} actor The actor to unregister.
   */
  unregisterActor(actor: AbstractActor): void {
    if (!this[FIELDS.actors].has(actor)) {
      return;
    }

    console.log("Unregistering an actor", actor);

    let listeners = this[FIELDS.actors].get(actor);
    for (let listener of listeners) {
      this.removeListener(listener);
    }

    actor.bindToEventBus(null);
    this[FIELDS.actors].delete(actor);
    this.dispatch("event-bus.actor-unregistered", actor);
    console.log("Actor unregistered", actor);
  }
}

/**
 * Retrieves the information about the event listener methods declared by the
 * provided actor.
 *
 * @param {AbstractActor} actor The actor.
 * @return {Map<string, string>} Map of names of observed events to the
 *         methods observing them.
 */
function getEventListeners(actor: AbstractActor): Map {
  let listenersMap = new Map();

  let finalPrototype = AbstractActor.prototype;
  let currentPrototype = Object.getPrototypeOf(actor);
  while (currentPrototype && (currentPrototype !== finalPrototype)) {
    for (let propertyName of Object.keys(currentPrototype)) {
      if (!(currentPrototype[propertyName] instanceof Function)) {
        continue;
      }
      if (propertyName.length <= 2) {
        continue;
      }
      if (propertyName.substring(0, 2) !== "on") {
        continue;
      }

      let eventName = methodNameToEvent(propertyName);
      listenersMap.set(eventName, propertyName);
    }
    currentPrototype = Object.getPrototypeOf(currentPrototype);
  }

  return listenersMap;
}

/**
 * Transforms the method name representing an event listener to the name of the
 * event observed by the method.
 *
 * @param {string} methodName The name of the method representing an event
 *        listener.
 * @return {string} Name of the observed event.
 */
function methodNameToEvent(methodName: string): string {
  let transformedEventName = methodName.substring(2);
  let eventName = transformedEventName.substring(0, 1).toLowerCase();

  for (let index = 1; index < transformedEventName.length; index++) {
    let character = transformedEventName.charAt(index);
    if (character === "_") {
      eventName += "-";
    } else if (character === character.toUpperCase()) {
      eventName += "." + character.toLowerCase();
    } else {
      eventName += character;
    }
  }

  return eventName;
}
