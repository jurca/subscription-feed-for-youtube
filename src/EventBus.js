
import createPrivate from "namespace-proxy"

/**
 * The default event await timeout in milliseconds.
 *
 * @type {number}
 */
const DEFAULT_WAIT_TIMEOUT = 1000 // milliseconds

const PRIVATE = createPrivate()

/**
 * A simple synchronous event bus for sending messages between parts of the
 * application within a single view.
 */
export default class EventBus {
  /**
   * Initializes the event bus.
   */
  constructor() {
    /**
     * The storage of event listeners. The keys are the event names.
     *
     * @type {Map<string, Set<{listener: function(*), context: ?Object}>>}
     */
    PRIVATE(this).eventListeners = new Map()

    Object.freeze(this)
  }

  /**
   * Returns the the dependencies required by the constructor of this class.
   *
   * @return The dependencies required by this class.
   */
  static get dependencies(): Array<any> {
    return []
  }

  /**
   * Registers the specified event listener for execution on the specified
   * event.
   *
   * @param event The event name.
   * @param listener The listener to register.
   * @param context The {@code this} context in which the listener is to be
   *        executed on the event.
   */
  addListener(event: string, listener: (eventData: any) => void,
      context: ?Object = null): void {
    if (!PRIVATE(this).eventListeners.has(event)) {
      PRIVATE(this).eventListeners.set(event, new Set())
    }

    PRIVATE(this).eventListeners.get(event).add({
      listener,
      context
    })
  }

  /**
   * Deregisters the specified listener from being triggered on the specified
   * event.
   *
   * The event name, the listener function and the context must match for the
   * listener to be deregistered.
   *
   * @param event The event name.
   * @param listener The listener to deregister.
   * @param context The {@code this} context in which the listener was to be
   *        executed on the event.
   */
  removeListener(event: string, listener: (eventData: any) => void,
      context: ?Object = null): void {
    if (!PRIVATE(this).eventListeners.has(event)) {
      return
    }

    let listeners = PRIVATE(this).eventListeners.get(event)
    for (let entry of listeners) {
      if ((entry.listener !== listener) || (entry.context !== context)) {
        continue
      }

      listeners.delete(entry)
    }

    if (!listeners.size) {
      PRIVATE(this).eventListeners.delete(event)
    }
  }

  /**
   * Fires the specified event, triggering all listeners registered for it.
   *
   * @param event The name of the event to fire.
   * @param data The data to send with the event.
   */
  fire(event: string, data: any = null): void {
    if (!PRIVATE(this).eventListeners.has(event)) {
      console.warn(`There is no listener registered for the ${event} event`)
      return
    }

    for (let entry of PRIVATE(this).eventListeners.get(event)) {
      entry.listener.call(entry.context, data)
    }
  }

  /**
   * Waits for the specified event to occur, and resolves to the data passed by
   * the event.
   *
   * @param eventName The name of the event to wait for.
   * @param timeout The maximum number of milliseconds the event should be
   *        waited for.
   * @return The awaited event data.
   * @throws {Error} Throw if the provided timeout is not a positive integer,
   *         or the event did not occur within the specified timeout.
   */
  async awaitEvent(eventName: string, timeout: number = DEFAULT_WAIT_TIMEOUT):
      any {
    if (timeout <= 0) {
      throw new Error("The timeout must be a positive integer")
    }

    return await new Promise((resolve, reject) => {
      this.addListener(eventName, listener, this)
      setTimeout(() => {
        this.removeListener(eventName, listener, this)
        reject(new Error(`The event ${eventName} did not occur within the ` +
            `specified timeout (${timeout} milliseconds)`))
      }, timeout)

      function listener(data) {
        this.removeListener(eventName, listener, this)
        resolve(data)
      }
    })
  }
}
