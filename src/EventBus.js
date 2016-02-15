
import createPrivate from "./createPrivate"

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

    for (let entry of PRIVATE(this).eventListeners) {
      entry.listener.call(entry.context, data)
    }
  }
}
