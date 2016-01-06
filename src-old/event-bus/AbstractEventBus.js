
/**
 * Map key used to store the listeners in an array.
 */
const LISTENERS_KEY = "*listeners";

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  listeners: Symbol("listeners")
});

/**
 * Base implementation of event bus, providing mostly low-level logic with both
 * one-way and with-callback events functionality. The low-level functionality
 * is not expected to be used in most cases, it is expected to extend this
 * class with high-level functionality based on the API provided by this class.
 *
 * @abstract
 */
export default class AbstractEventBus {
  /**
   * Initializes the event bus.
   */
  constructor() {
    if (this.constructor === AbstractEventBus) {
      throw new Error("The AbstractEventBus class is abstract");
    }

    /**
     * The tree of event name hierary, containig the registered event
     * listeners.
     */
    this[FIELDS.listeners] = new Map();
  }

  /**
   * Registers the provided event listener to observe the specified events.
   *
   * @param {string} eventName The name of the event to observe. The name
   *        represents a structured path separated by dots, for example
   *        {@code "system.sub-system.start"}. The last part may be a wildcard
   *        (*), for example {@code "system.*"}, which will result in observing
   *        all events within the parent namespace (for example
   *        {@code "system.start"} and {@code "system.sub-system.start"}.
   * @param {function(string, *, function(*)=)} listener The listener to
   *        register.
   */
  addListener(eventName: string, listener: Function): void {
    if (!eventName) {
      throw new Error("The event name cannot be empty");
    }

    let evetNamePath = eventName.split(".");
    let evenNamePathStart = evetNamePath.slice(0, evetNamePath.length - 1);
    if (evenNamePathStart.indexOf("*") > -1) {
      throw new Error("The * wildcard can only be the last part of the " +
          "event name path");
    }
    if (eventName.substring(0, eventName.length - 1).indexOf("*") > -1) {
      throw new Error("The * character can only be used as a wildcard as " +
          "the last part of the event name path");
    }

    let listeners = getListeners(this[FIELDS.listeners], evetNamePath, true);
    if (listeners.indexOf(listener) === -1) {
      listeners.push(listener);
    }
  }

  /**
   * Unregisters the specified event listeners from all events.
   *
   * @param {function(string, *, function(*)=)} listener The listener to
   *        unregister.
   */
  removeListener(listener: Function): void {
    removeListener(this[FIELDS.listeners], listener);
  }

  /**
   * Dispatches the specified event with the provided data and callback. Please
   * note that the callback may be executed multiple times if the event is
   * captured by multiple event listeners.
   *
   * @param {string} eventName The name of the event to dispatch. The name
   *        represents a structured path separated by dots, for example
   *        {@code "system.sub-system.start"}. Wildcards (*) are not allowed
   *        with event dispatching.
   * @param {*} data The data related to the event.
   * @param {?function(*)=} The optional callback passed to the event
   *        listeners. The callback will be invoked asynchronously by the event
   *        bus, even if invoked by the event listener right away.
   */
  dispatch(eventName: string, data, callback = null): void {
    if ((callback !== null) && !(callback instanceof Function)) {
      throw new TypeError("The callback must be either a function or null");
    }
    if (!eventName) {
      throw new Error("The event name cannot be empty");
    }
    if (eventName.indexOf("*") > -1) {
      throw new Error("The * wildcard can only be used when registering a " +
          "listener");
    }

    console.log(`Dispatching event ${eventName}`, data);

    let path = eventName.split(".");
    let listeners = getListeners(this[FIELDS.listeners], path);
    let listenerCount = listeners.length;
    executeListeners(listeners, eventName, data, callback);

    while (path.length) {
      path.pop();
      listeners = getListeners(this[FIELDS.listeners], path.concat("*"));
      listenerCount += listeners.length;
      executeListeners(listeners, eventName, data, callback);
    }

    if (!listenerCount) {
      console.warn(`The event ${eventName} was not captured by any listener`,
          data);
    }
  }
}

/**
 * Removes the specified event listener from the provided sub(tree) of event
 * listeners.
 *
 * @param {Map<string, (Map|function(string, *, function(*)=)[])} listenerMap
 *        Map representing the tree of event listeners, organized by event
 *        name path hierarchy.
 * @param {function(string, *, function(*)=)[]} listener The listener to remove
 *        from the provided listener tree.
 */
function removeListener(listenersMap: Map, listener: Function): void {
  for (let subTreeOrListeners of listenersMap.values()) {
    if (subTreeOrListeners instanceof Map) {
      removeListener(subTreeOrListeners, listener);
    } else if (subTreeOrListeners instanceof Array) {
      let index = subTreeOrListeners.indexOf(listener);
      if (index > -1) {
        subTreeOrListeners.splice(index, 1);
      }
    } else {
      throw new Error("The internal storage of event listeners seem to be " +
          "corrupt, encountered an unknown value: " + subTreeOrListeners);
    }
  }
}

/**
 * Executes the provided event listeners, passing the provided event to them.
 *
 * @param {function(string, *, function(*)=)[]} listeners The event listeners
 *        to execute.
 * @param {string} eventName The name of the event being dispatched.
 * @param {*} data The data associated with the event.
 * @param {?function(*)} callback Callback to execute by the executed listeners
 *        to push a response to the dispatcher of the event. Set to
 *        {@code null} if no callback has been provided.
 */
function executeListeners(listeners: Array, eventName: string, data,
    callback): void {
  for (let listener of listeners) {
    try {
      listener(eventName, data, function () {
        let args = arguments;
        setTimeout(() => {
          callback.apply(null, args);
        }, 0);
      });
    } catch (error) {
      console.error(
        `Event listener for event ${eventName} threw an error`,
        error,
        error.stack,
        data
      );
    }
  }
}

/**
 * Retrieves the event listeners at the specified position of the provided
 * event listeners map (tree). The method returns an empty array of the
 * specified path is not present in the provided tree.
 *
 * @param {Map<string, (Map|function(string, *, function(*)=)[])} listenerMap
 *        Map representing the tree of event listeners, organized by event
 *        name path hierarchy.
 * @param {string[]} path The event name path by which the event listeners
 *        shoud be retrieved.
 * @param {boolean=} create If {@code true}, the method will create the
 *        sub-trees on the specified path if they do not exist already.
 * @return {function(string, *, function(*)=)[]} The retrieved event listeners.
 */
function getListeners(listenerMap: Map, path: Array,
    create: boolean = false): Array {
  let targetLevel = navigateListenerMap(listenerMap, path, create);
  if (!targetLevel) {
    return [];
  }

  return targetLevel.get(LISTENERS_KEY);
}

/**
 * Navigates the provided listener map (tree) to retrieve the map level
 * (sub-tree) at the specified path.
 *
 * @param {Map<string, (Map|function(string, *, function(*)=)[])} listenerMap
 *        Map representing the tree of event listeners, organized by event
 *        name path hierarchy.
 * @param {string[]} path The event name path by which the sub-tree of event
 *        listeners shoud be retrieved.
 * @param {boolean=} create If {@code true}, the method will create the
 *        sub-trees on the specified path if they do not exist already.
 * @return {?Map<string, (Map|function(string, *, function(*)=)[])} The
 *         retrieved listeners map.
 */
function navigateListenerMap(listenerMap: Map, path: Array,
    create: boolean = false) {
  let currentMap = listenerMap;
  for (let part of path) {
    if (!currentMap.has(part)) {
      if (!create) {
        return null;
      }
      let nextLevel = new Map();
      nextLevel.set(LISTENERS_KEY, []);
      currentMap.set(part, nextLevel);
    }
    currentMap = currentMap.get(part);
  }

  return currentMap;
}
