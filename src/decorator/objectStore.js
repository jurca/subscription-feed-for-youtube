
/**
 * Decorator for easier specifying of the Indexed DB object store that holds
 * the model data.
 *
 * @param objectStoreName Indexed DB object store name.
 * @return Decorator applying the specified object store name to the provided
 *         entity class.
 */
export default function objectStore(objectStoreName: string):
    (target: Function) => void {
  if (!objectStoreName) {
    throw new TypeError("The object store name must be a non-empty string")
  }

  return (target: Function) => {
    Object.defineProperty(target, "objectStore", {
      value: objectStoreName
    })
  }
}
