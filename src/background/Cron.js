
import createPrivate from "namespace-proxy"
import EventBus from "../EventBus"

const PRIVATE = createPrivate()

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
     *         alarmId: string,
     *         task: function(),
     *         period: number,
     *         delay: number,
     *         eventBusEvents: Set<string>,
     *         lastExecution: number
     *       }[]}
     */
    PRIVATE(this).tasks = []

    PRIVATE(this).getNextAlarmId = (() => {
      const initializationTimestamp = Date.now().toString(36)
      let id = 0
      return () => `Cron:${initializationTimestamp}:${++id}`
    })()

    chrome.alarms.onAlarm.addListener((alarm: {name: string}) => {
      for (let taskDescriptor of PRIVATE(this).tasks) {
        if (taskDescriptor.alarmId === alarm.name) {
          this[PRIVATE.executeTask](taskDescriptor)
        }
      }
    })

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
    let taskDescriptor = {
      alarmId: "",
      task,
      period,
      delay,
      eventBusEvents,
      lastExecution: 0
    }
    PRIVATE(this).tasks.push(taskDescriptor)

    for (let eventName of eventBusEvents) {
      PRIVATE(this).eventBus.addListener(
        eventName,
        this[PRIVATE.executeTask].bind(this, taskDescriptor)
      )
    }

    this[PRIVATE.setUpTaskAlarms](taskDescriptor)
  }

  [PRIVATE.executeTask](
    taskDescriptor: {
      alarmId: string,
      task: () => void,
      period: number,
      delay: number,
      lastExecution: number
    }
  ): void {
    let executionStart = Date.now()
    chrome.alarms.clear(taskDescriptor.alarmId) // no need to wait
    try {
      taskDescriptor.task()
    } catch (error) {
      console.error(
        "Encountered an error during the execution of a task",
        error
      )
    }
    taskDescriptor.lastExecution = executionStart

    this[PRIVATE.setUpTaskAlarms](taskDescriptor)
  }

  [PRIVATE.setUpTaskAlarms](
    taskDescriptor: {alarmId: string, period: number, delay: number},
    isFirstRegistration: boolean = false
  ): void {
    taskDescriptor.alarmId = PRIVATE(this).getNextAlarmId
    chrome.alarms.create(taskDescriptor.alarmId, {
      delayInMinutes: (isFirstRegistration ? delay : period) / (60 * 1000)
    })
  }
}
