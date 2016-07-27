
import createPrivate from "namespace-proxy"
import EventBus from "../EventBus"

const PRIVATE = createPrivate()

// TODO: use the alarms API so that the background page may be converted to an
// event page one day

/**
 * Utility for automatic periodical and event-triggered execution of tasks.
 */
export default class Cron {
  /**
   * Initializes the time- and event-based task executor.
   *
   * @param eventBus The application's event bus, use for listening for events
   *        fired by other application's components.
   */
  constructor(eventBus: EventBus) {
    /**
     * The application's event bus, use for listening for events fired by other
     * application's components.
     *
     * @type {EventBus}
     */
    PRIVATE(this).eventBus = eventBus

    /**
     * The registered tasks that are executed by this cron. The {@code period}
     * and {@code delay} are specified in milliseconds, the
     * {@code lastExecution} is a UNIX timestamp of the last moment the task's
     * execution has been started, specified with millisecond-precision.
     *
     * @type {{
     *         task: function(),
     *         period: number,
     *         delay: number,
     *         eventBusEvents: Set<string>,
     *         lastExecution: number
     *       }[]}
     */
    PRIVATE(this).tasks = []

    Object.freeze(this)
  }

  /**
   * Schedules the provided task to be executed after the specified delay,
   * every specified period or on an occurrence of any of the specified event
   * bus events, whichever comes first.
   *
   * The task will be then re-executed after the specified period or with the
   * occurrence of any of the specified events, whichever comes first.
   *
   * @param task
   * @param period
   * @param delay
   * @param eventBusEvents
   */
  schedule(task: () => void, period: number, delay: number,
      ...eventBusEvents: Array<string>): void {
    // TODO
  }
}
