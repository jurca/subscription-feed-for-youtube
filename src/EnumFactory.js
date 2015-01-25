
import Enum from "./Enum";

/**
 * The {@linkcode EnumFactory} class is a static factory class for easy
 * creation of enum classes. An example is shown below:
 *
 * <pre>
 * const LightBulbState = EnumFactory.create("ON", "OFF");
 * </pre>
 *
 * @static
 */
export default class EnumFactory {
  /**
   * The private factory constructor. Since the {@linkcode EnumFactory} class
   * is static, no instances can be created.
   */
  constructor() {
    throw new Error("The EnumFactory class is static");
  }

  /**
   * Creates a new immutable enum class containig the specified constants.
   *
   * @param {...string} constants Names of the constants the enum class should
   *        contain.
   * @return {Function} The created enum class.
   */
  static create(...constants: Array<string>): Function {
    let FactoryEnum = class extends Enum {
      constructor() {
        super();
      }
    }

    for (let constantName of constants) {
      if (FactoryEnum[constantName] instanceof FactoryEnum) {
        throw new Error(`Invalid constant names: the ${constantName} is ` +
            "specified more than once");
      }
      FactoryEnum[constantName] = new FactoryEnum();
    }

    Object.freeze(FactoryEnum);

    return FactoryEnum;
  }
}
