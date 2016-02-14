
import createPrivate from "./createPrivate"

const PRIVATE = createPrivate()

export default class EventBus {
  constructor() {
    /**
     * @type {Map<string, Set<{listener: function(*), context: ?Object}>>}
     */
    PRIVATE(this).eventListeners = new Map()

    Object.freeze(this)
  }

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
