
import AbstractMigrator from "./AbstractMigrator";

/**
 * Database migrator for migrating from version 0 to version 1 (initial
 * database initialization).
 */
export default class V1 extends AbstractMigrator {
  /**
   * Initializes the migrator.
   */
  constructor() {
    super();
  }

  // override
  migrate(database: IDBDatabase): void {
    let accountStore = database.createObjectStore("Account", {
      keyPath: "id"
    });
    accountStore.createIndex("state", "state");
    accountStore.createIndex("lastUpdate", "lastUpdate");

    let channelStore = database.createObjectStore("Channel", {
      keyPath: "id"
    });
    channelStore.createIndex("lastUpdate", "lastUpdate");

    let playlistStore = database.createObjectStore("Playlist", {
      keyPath: "id"
    });
    playlistStore.createIndex("lastUpdate", "lastUpdate");

    let subscriptionStore = database.createObjectStore("Subscription", {
      keyPath: "id",
      autoIncrement: true
    });
    subscriptionStore.createIndex("state", "state");

    let videoStore = database.createObjectStore("Video", {
      keyPath: "id"
    });
    videoStore.createIndex(
      "listing",
      ["watched", "uploaded", "accounts", "incognitoSubscriptions"],
      {
        multiEntry: true
      }
    );
    videoStore.createIndex("lastUpdate", "lastUpdate");
  }
}
