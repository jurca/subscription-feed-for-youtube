
import createPrivate from "namespace-proxy"
import AbstractHandler from "./resourceHandler/AbstractHandler"

const PRIVATE = createPrivate()

export default class RequestHandler {
  constructor(...resourceHandlers: AbstractHandler[]) {
    /**
     * @type {AbstractHandler[]}
     */
    PRIVATE(this).resourceHandlers = resourceHandlers

    /**
     * @type {function(
     *         this:RequestHandler,
     *         {resource: string, method: string, parameters: ?Object<string, (number|string)>, data: ?Object<string, *>},
     *         sender: *,
     *         sendResponse: function(*))
     *       }
     */
    PRIVATE(this).onMessage = this[PRIVATE.onMessage].bind(this);

    /**
     * @type {boolean}
     */
    PRIVATE(this).running = false
    
    Object.seal(this)
  }
  
  start() {
    if (PRIVATE(this).running) {
      throw new Error("The request handler is already running")
    }

    chrome.runtime.onMessage.addListener(PRIVATE(this).onmessage)
    PRIVATE(this).running = true
  }
  
  stop() {
    if (PRIVATE(this).running) {
      throw new Error("The request handler is already stopped")
    }

    chrome.runtime.onMessage.removeListener(PRIVATE(this).onmessage)
    PRIVATE(this).running = false
  }

  /**
   * Incoming message handler.
   *
   * @param message The received message.
   * @param sender Identifier of the sender of the received message, which is
   *        irrelevant due to constraints imposed by Chrome.
   * @param sendResponse The callback to use to send the response to the sender
   *        of the message.
   * @return Always {@code true}, indicating the message will be responded to
   *         asynchronically.
   */
  [PRIVATE.onMessage](
    message: {resource: string, method: string, parameters: ?Object<string, (number|string)>, data: ?Object<string, *>},
    sender: any,
    sendResponse: (response: ({response: any}|{error: {name: string, message: string, stack: string}})) => void
  ): boolean {
    let processPromise

    for (let handler of PRIVATE(this).resourceHandlers) {
      if (handler.resourceName !== message.resource) {
        continue
      }

      switch (message.method) {
        case "list":
          processPromise = handler.list(message.parameters)
          break
        case "get":
          processPromise = handler.get(message.parameters)
          break
        case "patch":
          processPromise = handler.patch(message.data)
          break
        case "create":
          processPromise = handler.create(message.data)
          break
        case "delete":
          processPromise = handler.delete(message.parameters)
          break
        default:
          throw new Error("Received a message with an unknown method: " +
              message.method)
      }
      break
    }

    if (!processPromise) {
      throw new Error("Received a message targeted at an unknown resource: " +
          message.resource)
    }

    processPromise.then((response) => {
      sendResponse({ response })
    }).catch((error) => {
      sendResponse({
        error: Object.assign({}, error, {
          stack: error.stack
        })
      })
    })

    return true
  }
}
