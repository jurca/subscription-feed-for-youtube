
import createPrivate from "namespace-proxy"

const PRIVATE = createPrivate()

export default class BackgroundConnector {
  static get dependencies() {
    return []
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
