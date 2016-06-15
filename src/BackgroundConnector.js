
import createPrivate from "namespace-proxy"
import PortFactory from "./PortFactory"

const PRIVATE = createPrivate()

/**
 * Utility for communicating with the background page using web messaging.
 */
export default class BackgroundConnector {
  /**
   * Initializes the background page connector.
   *
   * @param portFactory Factory for creating ports used for two-way
   *        communication with the background page.
   */
  constructor(portFactory: PortFactory) {
    /**
     * Factory for creating ports used for two-way communication with the
     * background page.
     *
     * @type {PortFactory}
     */
    PRIVATE(this).portFactory = portFactory
  }
  
  async list(resource: string,
      parameters: ?Object<string, (number|string)> = null): any {
    return await this[PRIVATE.sendRequest]("list", resource, parameters)
  }

  async get(resource: string,
      parameters: ?Object<string, (number|string)>): any {
    return await this[PRIVATE.sendRequest]("get", resource, parameters)
  }

  async patch(resource: string, data: ?Object<string, any>): any {
    return await this[PRIVATE.sendRequest]("patch", resource, null, data)
  }

  async create(resource: string, data: ?Object<string, any>): any {
    return await this[PRIVATE.sendRequest]("create", resource, null, data)
  }

  async delete(resource: string,
      parameters: ?Object<string, (number|string)>): any {
    return await this[PRIVATE.sendRequest]("delete", resource, parameters)
  }

  /**
   * Creates a new port for two-way communication with the background page.
   *
   * @return The created port.
   */
  createPort(): chrome.runtime.Port {
    return PRIVATE(this).portFactory.createPort()
  }

  /**
   * Sends the provided one-off message to the background page.
   *
   * @param method The method to use to access to resource.
   * @param resource The name of the resource to access.
   * @param parameters The parameters to send to the resource.
   * @param data The data to send to the resource.
   * @return Background page's response.
   */
  async [PRIVATE.sendRequest](method: string, resource: string,
      parameters: ?Object<string, (number|string)>,
      data: ?Object<string, any> = null): any {
    let message = {
      resource,
      method,
      parameters,
      data
    }

    return await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(null, message, null, (response) => {
        if (response.error) {
          reject(response.error)
        } else {
          resolve(response.response)
        }
      })
    })
  }
}
