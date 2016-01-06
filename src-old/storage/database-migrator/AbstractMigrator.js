
/**
 * Base class of all database version migrators. Each migrator handles
 * migration only between two subsequent versions.
 *
 * @abstract
 */
export default class AbstractMigrator {
  /**
   * Initializes the migrator.
   */
  constructor() {
    if (this.constructor === AbstractMigrator) {
      throw new Error("The AbstractMigrator class is abstract");
    }

    if (this.migrate === AbstractMigrator.prototype.migrate) {
      throw new Error("The migrate method is abstract and must be overridden");
    }
  }

  /**
   * Migrates the database to the version this migrator provides.
   *
   * @param {IDBDatabase} database The database to migrate.
   */
  migrate(database: IDBDatabase): void {
    throw new Error("The migrate method is abstract and must be overridden");
  }
}
