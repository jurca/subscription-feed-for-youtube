
import MigrationProvider from "./database-migrator/MigrationProvider";

/**
 * Utility for migrating the database to newer versions.
 */
const migrator = new MigrationProvider();

/**
 * Name of the database to connect to.
 */
const DB_NAME = "subscriptionFeed";

/**
 * Current version of the database.
 */
const DB_VERSION = 1;

/**
 * Delay in milliseconds between reconnecting to the database. The connection
 * is lost usually when a {@code versionchange} event occurs on the database.
 */
const RECONNECT_DELAY = 200;

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  database: Symbol("database"),
  errorObservers: Symbol("errorObservers")
});

/**
 * Provider of database connection and automatic database upgrator.
 */
export default class Database {
  /**
   * Initializes the database connection.
   */
  constructor() {
    /**
     * The database connection promise.
     *
     * @type {Promise<IDBDatabase>}
     */
    this[FIELDS.database] = connect().then((database) => {
      database.onversionchange = () => reconnect(this);
      database.onerror = (error) => executeErrorObservers(this, error);
      return database;
    });

    /**
     * List of currently registered error observers.
     *
     * @type {function(Error)[]}
     */
    this[FIELDS.errorObservers] = [];
  }

  /**
   * Retrieves the current database connection. It is recommended not to cache
   * the returned connection as it may be replaced in time.
   *
   * @return {IDBDatabase} The current database connection.
   */
  async getConnection(): IDBDatabase {
    return await this[FIELDS.database];
  }

  /**
   * Registers the provided error observer to be executed whenever an error is
   * encounterer that is not captured on transaction or operation level.
   * Registering the same observer multiple times has no effect.
   *
   * @param {function(Error)} observer The observer to register.
   */
  addErrorObserver(observer: Function): void {
    if (this[FIELDS.errorObservers].indexOf(observer) > -1) {
      return;
    }

    this[FIELDS.errorObservers].push(observer);
  }

  /**
   * Removes the specified error observer from the registered error observers.
   *
   * @param {function(Error)} observer The observer to unregister.
   */
  removeErrorObserver(observer: Function): void {
    let index = this[FIELDS.errorObservers].indexOf(observer);
    if (index > -1) {
      this[FIELDS.errorObservers].splice(index, 1);
    }
  }
}

/**
 * Executes the error observers registered on the provided database instance.
 *
 * @param {Database} instance The instance on which the error observers are
 *        registered.
 * @param {Error} error The encountered error.
 */
function executeErrorObservers(instance: Database, error): void {
  instance[FIELDS.errorObservers].forEach((observer) => {
    try {
      observer(error);
    } catch (observerError) {
      console.error(
        "The registered error observer threw an error",
        observerError,
        observerError.stack,
        "Error passed to the observer:",
        error,
        error instanceof Error ? error.stack : "[stack unknown]"
      );
    }
  });

  if (!instance[FIELDS.errorObservers].length) {
    console.error(
      "Encountered an error while no error observers are registered",
      error,
      error instanceof Error ? error.stack : "[stack unknown]"
    );
  }
}

/**
 * Closes the current connection to the IndexedDB datbase in the provided
 * instance and then resets the connection field to a new promise that
 * reconnects to the database after {@code RECONNECT_DELAY} milliseconds.
 *
 * @param {Database} instance The instance that should have its connection
 *        reset.
 */
function reconnect(instance: Database): void {
  instance[FIELDS.database].then((database) => database.close());

  instance[FIELDS.database] = new Promise((resolve) => {
    setTimeout(resolve, RECONNECT_DELAY); // give it some time to upgrade
  }).
  then(connect).
  then((database) => {
    database.onversionchange = () => reconnect(instance);
    database.onerror = (error) => executeErrorObservers(instance, error);
    return database;
  });
}

/**
 * Connects to the database and performs database version migration if needed.
 *
 * @return {Promise<IDBDatabase>} Promise resolved to the database connection.
 */
function connect(): Promise {
  return new Promise((resolve, reject) => {
    let openRequest = indexedDB.open(DB_NAME, DB_VERSION);
    openRequest.onerror = reject;
    openRequest.onblocked = () => reject("Cannot upgrade database version " +
        "because the database is still in use");
    openRequest.onsuccess = () => resolve(openRequest.result);

    openRequest.onupgradeneeded = (event) => {
      let database = event.target.result;
      migrator.migrate(database);
    };
  });
}
