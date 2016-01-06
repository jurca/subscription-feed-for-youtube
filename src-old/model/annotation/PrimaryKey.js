
const FIELDS = Object.freeze({
  fieldName: Symbol("fieldName")
});

/**
 * Annotation for specifying the primary key field of a model.
 *
 * @annotation
 */
export default class PrimaryKey {
  /**
   * Creates the annotaion instance.
   *
   * @param {string} fieldName The name of the primary key field.
   */
  constructor(fieldName: string) {
    this[FIELDS.fieldName] = fieldName;
  }

  /**
   * Returns the name of the field representing the model primary key.
   *
   * @return {string} Name of the field representing the model primary key.
   */
  get fieldName(): string {
    return this[FIELDS.fieldName];
  }
}
