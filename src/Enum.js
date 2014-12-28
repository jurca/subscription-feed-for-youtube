
/**
 * Private field symbols.
 *
 * @type {Object<string, symbol>}
 */
const FIELDS = Object.freeze({
  name: Symbol("name")
});

/**
 * Base class of all object-oriented Java-like enums. It is recommended to use
 * the {@linkcode EnumFactory} to declare enums to make the whole process much
 * simpler.
 *
 * It is recommended that all enum constants and enum classes are made
 * immutable using {@linkcode Object.freeze()} (this is done by the
 * {@linkcode EnumFactory} automatically). An example is shown below:
 *
 * <pre>
 * // Declare the enum class
 * class LightBulbState extends Enum {
 *   constructor() {
 *     super();
 *     Object.freeze(this);
 *   }
 * }
 *
 * // Declare the enum constants
 * LightBulbState.ON = new LightBulbState();
 * LightBulbState.OFF = new LightBulbState();
 *
 * // Make the enum class immutable
 * Object.freeze(LightBulbState);
 * </pre>
 *
 * @abstract
 */
export default class Enum {
  /**
   * Creates a new enum constant.
   *
   * @throws {Error} Thrown if the {@linkcode Enum} class is instantiated
   *         without being extended or the enum class is frozen
   */
  constructor() {
    if (this.constructor === Enum) {
      throw new Error("The enum class is abstract");
    }
    if (Object.isFronzen(this.constructor)) {
      throw new Error("This enum is already constructed, no new constants " +
          "may be created");
    }

    /**
     * Cached name of this enum constant. The name is fetched lazily upon first
     * need.
     *
     * @type {?string}
     */
    this[FIELDS.name] = null;
  }

  /**
   * Returns the name of this enum constant.
   *
   * @return {string} The name of this enum constant.
   */
  get name(): string {
    if (this[FIELDS.name] === null) {
      Object.keys(this.constructor).some((constant) => {
        if (this.constructor[constant] === this) {
          this[FIELDS.name] = constant;
          return true;
        }
      });

      if (this[FIELDS.name] === null) {
        throw new Error("This enum constant is not registered with its class");
      }
    }

    return this[FIELDS.name];
  }

  /**
   * Returns the string representation of this enum constant - the constant
   * name.
   *
   * @return {string} The name of this enum constant.
   */
  toString(): string {
    return this.name;
  }

  /**
   * Returns the value representing this object - a string containing the name
   * of this enum constant.
   *
   * @return {string} The name of this enum constant.
   */
  valueOf(): string {
    return this.toString();
  }
}
