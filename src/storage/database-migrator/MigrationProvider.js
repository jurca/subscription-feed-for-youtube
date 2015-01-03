
import V1 from "./V1";

/**
 * Database version migration providers. Each element migrates the database one
 * version up: the 0th element migrates from version 0 to 1, the 1st from
 * version 1 to 2, etc...
 *
 * The elements are constructor functions of the classes extending the
 * {@codelink AbstractMigrator} class.
 */
const MIGRATORS = [
  V1
];

/**
 * Utility for migrating the database to the current version.
 */
export default class MigrationProvider {
  /**
   * Performs migration of the provided database to the current version.
   */
  migrate(database: IDBDatabase) {
    let currentVersion = database.version;
    if (currentVersion === "") {
      currentVersion = 0;
    } else if (typeof currentVersion === "string") {
      // DB version is always an int in our case
      currentVersion = parseInt(currentVersion, 10);
    }

    let targetVersion = MIGRATORS.length;
    for (let version = currentVersion; version <= targetVersion; version++) {
      let migrator = new MIGRATORS[currentVersion]();
      migrator.migrate(database);
    }
  }
}
