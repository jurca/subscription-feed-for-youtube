
import createPrivate from "namespace-proxy"

const PRIVATE = createPrivate()

/**
 * A simple locking mechanism for synchronizing tasks performed in async
 * functions.
 */
export default class Lock {
  /**
   * Initializes the lock.
   */
  constructor() {
    /**
     * Whether or not is this lock currently locked.
     *
     * @type {boolean}
     */
    PRIVATE(this).locked = false

    /**
     * The queue of task resume callback for tasks that are waiting for the lock.
     *
     * @type {function()[]}
     */
    PRIVATE(this).taskTriggerQueue = []
  }

  /**
   * Executes the provided task by acquiring this lock for the test (once
   * available), running the task, releasing the lock and returing the task's
   * result.
   *
   * @param task The task that should be performed synchronized by this lock.
   * @return The result of the provided task.
   */
  async lock<R>(task: () => R): R {
    if (PRIVATE(this).locked) {
      await new Promise((resolve) => {
        PRIVATE(this).taskTriggerQueue.push(resolve)
      })
    } else {
      PRIVATE(this).locked = true
    }

    let result = await task()

    if (PRIVATE(this).taskTriggerQueue.length) {
      let trigger = PRIVATE(this).taskTriggerQueue.shift()
      trigger()
    } else {
      PRIVATE(this).locked = false
    }

    return result
  }
}
