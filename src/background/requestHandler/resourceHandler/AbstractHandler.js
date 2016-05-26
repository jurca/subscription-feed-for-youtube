
export default class AbstractHandler {
  get resourceName() {
    throw new Error("The resourceName getter is abstract and must be " +
        "overridden")
  }
  
  async list(parameters: Object<string, (number|string)>): * {
    throw new Error(`The ${this.resourceName} does not support the list ` +
        "method")
  }

  async get(parameters: Object<string, (number|string)>): * {
    throw new Error(`The ${this.resourceName} does not support the get ` +
        "method")
  }

  async patch(data: Object<string, *>): * {
    throw new Error(`The ${this.resourceName} does not support the patch ` +
        "method")
  }

  async create(data: Object<string, *>): * {
    throw new Error(`The ${this.resourceName} does not support the create ` +
        "method")
  }

  async delete(data: Object<string, *>): * {
    throw new Error(`The ${this.resourceName} does not support the delete ` +
        "method")
  }
}
