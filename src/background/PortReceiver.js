
import createPrivate from "namespace-proxy"

const PRIVATE = createPrivate()

/**
 * Utility for receiving connection ports at the background page event if they
 * are still in process of connecting.
 */
export default class PortReceiver {
  /**
   * Initializes the port receiver.
   *
   * @param connectionTimeout The number of milliseconds to wait for
   *        not-yet-connected ports to connect to the background page.
   */
  constructor(connectionTimeout: number) {
    /**
     * The number of milliseconds to wait for not-yet-connected ports to
     * connect to the background page.
     *
     * @type {number}
     */
    PRIVATE(this).connectionTimeout = connectionTimeout

    /**
     * The ports that have connected to the background page.
     *
     * @type {Map<string, chrome.runtime.Port>}
     */
    PRIVATE(this).ports = new Map()

    /**
     * Map of names of port being waited to connect to the background page to
     * the callbacks to execute when the port connects.
     * 
     * @type {Map<string, function(chrome.runtime.Port)>}
     */
    PRIVATE(this).portAwaitCallbacks = new Map()

    chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
      let portName = port.name
      port.onDisconnect.addEventListener(() => {
        PRIVATE(this).ports.delete(portName)
        PRIVATE(this).portAwaitCallbacks.delete(portName)
      })
      
      if (PRIVATE(this).portAwaitCallbacks.has(portName)) {
        PRIVATE(this).portAwaitCallbacks.get(portName)(port)
      }
    })

    Object.freeze(this)
  }

  /**
   * Awaits for the specified port to connect to the background page, and then
   * returns the connection port.
   *
   * Always close the connection port once it is now longer needed so that the
   * background page can be unloaded.
   *
   * @param portName The name of the connection port to retrieve.
   * @return The specified communication port.
   * @throws {Error} Thrown if the connection port has not connected to the
   *         background page nor will connect within the configured timeout.
   */
  async getPort(portName: string): chrome.runtime.Port {
    if (PRIVATE(this).ports.has(portName)) {
      return PRIVATE(this).ports.get(portName)
    }
    
    if (PRIVATE(this).portAwaitCallbacks.has(portName)) {
      throw new Error(`The port named ${portName} is already being waited for`)
    }
    
    return await new Promise((resolve, reject) => {
      PRIVATE(this).portAwaitCallbacks.set(portName, resolve)
      setTimeout(() => {
        reject(new Error(`A port named ${portName} failed to connect within` +
            `the configured timeout (${PRIVATE(this).connectionTimeout} ` +
            "milliseconds)"))
      }, PRIVATE(this).connectionTimeout)
    })
  }
}
