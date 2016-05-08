
import createPrivate from "namespace-proxy"
import DatabaseFactory from "indexed-db.es6"
import IDBDatabase from "indexed-db.es6/es2015/Database"
import EntityManager from "idb-entity/es2015/EntityManager"
import EntityManagerFactory from "idb-entity"
import v1Schema from "./schema/v1"

const PRIVATE = createPrivate()

/**
 * Database (Indexed DB) connection provider.
 */
export default class Database {
  /**
   * Initializes the database connection to the specified Indexed DB database.
   *
   * @param databaseName The name of the database to use.
   */
  constructor(databaseName: string) {
    PRIVATE(this).connection = DatabaseFactory.open(
      databaseName,
      v1Schema
    ).then((databaseConnection) => {
      databaseConnection.addVersionChangeListener((newVersion) => {
        console.warn("The database is being updated to a new version: " +
            newVersion)

        // Note: the connection is terminated after all active transactions
        // complete
        databaseConnection.close()
      })

      return databaseConnection
    })

    PRIVATE(this).entityManagerFactory = new EntityManagerFactory(
      PRIVATE(this).connection
    )
  }

  /**
   * Creates a new entity manager.
   *
   * @return The new entity manager.
   */
  createEntityManager(): EntityManager {
    return PRIVATE(this).entityManagerFactory.createEntityManager()
  }

  /**
   * Returns the current database connection.
   *
   * @return The current database connection.
   */
  async getConnection(): IDBDatabase {
    return await PRIVATE(this).connection
  }
}
