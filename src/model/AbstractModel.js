
import "moment";
import Enum from "../Enum";
import Generated from "./annotation/Generated";
import PrimaryKey from "./annotation/PrimaryKey";
import Time from "./Time";

/**
 * Moment instances constructor.
 */
const Moment = moment().constructor;

/**
 * Base class of all model classes.
 *
 * @abstract
 */
export default class AbstractModel {
  /**
   * Loads the state of this model from the provided serialized state.
   *
   * @param {Object<string, *>} data The serialized state to load.
   */
  load(data: Object): void {
    Object.keys(data).forEach((field) => {
      if (!this.hasOwnProperty(field)) {
        continue;
      }

      if (this[field] instanceof Moment) {
        this[field] = moment(data[field]);
      } else if (this[field] instanceof Enum) {
        this[field] = this[field].constructor[data[field]];
      } else if (this[field] instanceof Time) {
        this[field] = new Time(data[field]);
      } else {
        this[field] = data[field];
      }
    });
  }

  /**
   * Serializes the state of this model to an object that can be safely stored
   * in the persistent storage.
   *
   * @return {Object<string, *>} Serialized state of this model.
   */
  serialize(): Object {
    let serialized = {};

    let annotations = this.constructor.annotations || [];
    let primaryKey = null;
    let primaryKeyGenerated = false;
    for (let annotation of annotations) {
      if (annotation instanceof Generated) {
        primaryKeyGenerated = true;
      }
      if (annotation instanceof PrimaryKey) {
        primaryKey = annotation.fieldName;
      }
    }
    if (primaryKey === null) {
      throw new Error(`The ${this.constructor.name} model class does not ` +
          "specify the primary key field.");
    }

    for (field of Object.keys(this)) {
      if (primaryKeyGenerated && (field === primaryKey)) {
        continue;
      }

      if (this[field] instanceof Moment) {
        serialized[field] = this[field].toDate();
      } else if (this[field] instanceof Enum) {
        serialized[field] = this[field].name;
      } else if (this[field] instanceof Time) {
        serialized[field] = this[field].value;
      } else {
        serialized[field] = this[field];
      }
    }

    return serialized;
  }
}
