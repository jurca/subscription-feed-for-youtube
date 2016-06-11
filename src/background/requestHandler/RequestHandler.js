
import createPrivate from "namespace-proxy"
import AbstractHandler from "./resourceHandler/AbstractHandler"

const PRIVATE = createPrivate()

/**
 * The request handler is REST API-like server that allows other views of the
 * extension to communicate with the background page by sending messages and
 * receiving replies.
 */
export default class RequestHandler {
  /**
   * Initializes the request handler.
   *
   * @param resourceHandlers The resource handlers that should be used to
   *        handle the incoming messages. There cannot be multiple resource
   *        handlers handling the same resource.
   */
  constructor(...resourceHandlers: AbstractHandler[]) {
    let handledResources = new Set()
    for (let handler of resourceHandlers) {
      let resourceName = handler.resourceName
      if (handledResources.has(resourceName)) {
        throw new Error("Obtained multiple resource handlers for handling " +
            `the ${resourceName} resource`)
      }
      handledResources.add(resourceName)
    }

    /**
     * The resource handlers that should be used to handle the incoming
     * messages.
     *
     * @type {AbstractHandler[]}
     */
    PRIVATE(this).resourceHandlers = resourceHandlers

    /**
     * The private {@code onMessage} method bound to this instance. The method
     * is used as an event listener for the incoming messages.
     *
     * @type {function(
     *         this:RequestHandler,
     *         {resource: string, method: string, parameters: ?Object<string, (number|string)>, data: ?Object<string, *>},
     *         sender: *,
     *         sendResponse: function(*))
     *       }
     */
    PRIVATE(this).onMessage = this[PRIVATE.onMessage].bind(this);

    /**
     * The state of the request handler.
     *
     * @type {boolean}
     */
    PRIVATE(this).running = false
    
    Object.seal(this)
  }

  /**
   * Starts the request handler, allowing it to handle incoming messages,
   * processing them and sending replies.
   */
  start() {
    if (PRIVATE(this).running) {
      throw new Error("The request handler is already running")
    }

    chrome.runtime.onMessage.addListener(PRIVATE(this).onMessage)
    PRIVATE(this).running = true
  }

  /**
   * Stops the request handler. This method should not be used under normal
   * circumstances, it is useful for debugging only.
   */
  stop() {
    if (PRIVATE(this).running) {
      throw new Error("The request handler is already stopped")
    }

    chrome.runtime.onMessage.removeListener(PRIVATE(this).onMessage)
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
    message: {resource: string, method: string, parameters: ?Object<string, (number|string)>, data: ?Object<string, any>},
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
