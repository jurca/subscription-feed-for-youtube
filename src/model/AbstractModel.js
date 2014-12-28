
import "moment";
import Enum from "../Enum";
import PrimaryKey from "./annotation/PrimaryKey";

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
      } else if (this[field] instanceof AbstractModel) {
        this[field] = this[field].constructor.find(data[field]);
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

    for (field of Object.keys(this)) {
      if (this[field] instanceof Moment) {
        serialized[field] = this[field].toDate();
      } else if (this[field] instanceof Enum) {
        serialized[field] = this[field].name;
      } else if (this[field] instanceof AbstractModel) {
        let annotations = this[field].constructor.annotations;
        if (!annotations) {
          throw new Error(`The ${field} field is a ` +
              `${this[field].constructor.name} model instance, but the ` +
              "model does not define a primary key");
        }

        let primaryKeyField = null;
        annotations.some((annotation) => {
          if (annotation instanceof PrimaryKey) {
            primaryKeyField = annotation.fieldName;
            return true;
          }
        });
        if (!primaryKeyField) {
          throw new Error(`The ${field} field is a ` +
              `${this[field].constructor.name} model instance, but the ` +
              "model does not define a primary key");
        }

        serialized[field] = this[field][primaryKeyField];
      } else {
        serialized[field] = this[field];
      }
    }

    return serialized;
  }
}
