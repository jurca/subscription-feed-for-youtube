
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

  /**
   * Sends a {@code list} method request to the specified resource of the
   * background page. Use this to lists of entities.
   *
   * @param resource The name of the resource.
   * @param parameters Additional parameters to pass to the resource.
   * @return The background page's response.
   */
  async list(resource: string,
      parameters: ?Object<string, (number|string)> = null): any {
    return await this[PRIVATE.sendRequest]("list", resource, parameters)
  }

  /**
   * Sends a {@code get} method request to the specified resource of the
   * background page. Use this to retrieve single entities.
   *
   * @param resource The name of the resource.
   * @param parameters Additional parameters to pass to the resource.
   * @return The background page's response.
   */
  async get(resource: string,
      parameters: ?Object<string, (number|string)>): any {
    return await this[PRIVATE.sendRequest]("get", resource, parameters)
  }

  /**
   * Sends a {@code patch} method request to the specified resource of the
   * background page. Use this to partially modify entities.
   *
   * @param resource The name of the resource.
   * @param data The data identifying the entity to modify and containing the
   *        entity's data update.
   * @return The background page's response.
   */
  async patch(resource: string, data: ?Object<string, any>): any {
    return await this[PRIVATE.sendRequest]("patch", resource, null, data)
  }

  /**
   * Sends a {@code create} method request to the specified resource of the
   * background page. Use this to create entities.
   *
   * @param resource The name of the resource.
   * @param data The data representing the entity and/or any related details.
   * @return The background page's response.
   */
  async create(resource: string, data: ?Object<string, any>): any {
    return await this[PRIVATE.sendRequest]("create", resource, null, data)
  }

  /**
   * Sends a {@code delete} method request to the specified resource of the
   * background page. Use this to delete entities.
   *
   * @param resource The name of the resource.
   * @param parameters Additional parameters to pass to the resource.
   * @return The background page's response.
   */
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
