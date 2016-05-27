
/**
 * The base class for resource handlers.
 * 
 * @abstract
 */
export default class AbstractHandler {
  /**
   * Returns the name of the resource handled by this resource handler.
   *
   * @abstract
   * @return The name of the resource handled by this resource handler.
   */
  get resourceName(): string {
    throw new Error("The resourceName getter is abstract and must be " +
        "overridden")
  }

  /**
   * Fetches the entities matched by the provided parameters. The order of the
   * entities may also be specified by the parameters, if this resource
   * supports it.
   *
   * @param parameters The parameters by which the entities should be matched.
   * @return The list of entities that were matched by the provided parameters.
   */
  async list(
    parameters: Object<string, (number|string|number[]|string[])>
  ): Array<*> {
    throw new Error(`The ${this.resourceName} does not support the list ` +
        "method")
  }

  /**
   * Fetches a single entity matching the provided parameters, or resolves to a
   * {@code null} if no such entity exists in this resource.
   *
   * @param parameters The parameters by which the entity should be matched.
   * @return A JSON-serializable representation of the fetched entity, or
   *         {@code null} if no matching entity has been found.
   */
  async get(parameters: Object<string, (number|string|number[]|string[])>): * {
    throw new Error(`The ${this.resourceName} does not support the get ` +
        "method")
  }

  /**
   * Patches the entity within this resource that was matched by primary key in
   * the provided data using the provided data.
   *
   * @param data The data representing the patch of the entity, and identifying
   *        the entity to patch.
   * @return A JSON-serializable representation of the patched entity.
   */
  async patch(data: Object<string, *>): * {
    throw new Error(`The ${this.resourceName} does not support the patch ` +
        "method")
  }

  /**
   * Creates a new entity from the provided data within this resource.
   *
   * @param data The data representing the entity to create within this
   *        resource.
   * @return A JSON-serializable representation of the created entity.
   */
  async create(data: Object<string, *>): * {
    throw new Error(`The ${this.resourceName} does not support the create ` +
        "method")
  }

  /**
   * Deletes the entities within this resource that are matched by the provided
   * parameters.
   *
   * The method must resolve after the entities have been deleted.
   *
   * @param parameters The request parameters, specifying the entity(ies) to
   *        delete.
   */
  async delete(
    parameters: Object<string, (number|string|number[]|string[])>
  ): void {
    throw new Error(`The ${this.resourceName} does not support the delete ` +
        "method")
  }
}
