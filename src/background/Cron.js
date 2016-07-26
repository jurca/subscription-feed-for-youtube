
import createPrivate from "namespace-proxy"
import EventBus from "../EventBus"

const PRIVATE = createPrivate()

// TODO: use the alarms API so that the background page may be converted to an
// event page one day

export default class Cron {
  constructor(eventBus: EventBus) {
    PRIVATE(this).eventBus = eventBus

    /**
     *
     * @type {{
     *         task: function(),
     *         period: number,
     *         delay: number,
     *         eventBusEvents: Set<string>
     *       }[]}
     */
    PRIVATE(this).tasks = []

    Object.freeze(this)
  }

  schedule(task: () => void, period: number, delay: number,
      ...eventBusEvents: Array<string>): void {
    // TODO
  }
}
