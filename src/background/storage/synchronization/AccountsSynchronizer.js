
import createPrivate from "../../../createPrivate"
import EventBus from "../../../EventBus"
import Account from "../../../model/Account"
import ClientFactory from "../../youtube-api/ClientFactory"
import Database from "../Database"
import SyncStorage from "../SyncStorage"

const PRIVATE = createPrivate()

/**
 * Utility for synchronizing the user's Google accounts in the main data
 * storage (Indexed DB) against the modifications reported by the Chrome's
 * (cross-device) synchronized storage.
 */
export default class AccountsSynchronizer {
  /**
   * Initializes the accounts storage synchronizer.
   *
   * @param eventBus The event bus that will deliver event about account
   *        modifications. The accounts synchronizer will use it to notify the
   *        application when an account has been successfully added.
   * @param clientFactory Factory for YouTube API clients.
   * @param database The Indexed DB database connection.
   */
  constructor(eventBus: EventBus, clientFactory: ClientFactory,
      database: Database) {
    /**
     * The event bus that will deliver event about account modifications. The
     * accounts synchronizer will use it to notify the application when an
     * account has been successfully added.
     */
    PRIVATE(this).eventBus = eventBus

    /**
     * Factory for YouTube API clients.
     */
    PRIVATE(this).clientFactory = clientFactory

    /**
     * The Indexed DB database connection.
     */
    PRIVATE(this).database = database

    eventBus.addListener(
      SyncStorage.EVENTS.ACCOUNT_ADDED,
      this[PRIVATE.onAccountAdded],
      this
    )

    eventBus.addListener(
      SyncStorage.EVENTS.ACCOUNT_ENABLED,
      this[PRIVATE.onAccountEnabled],
      this
    )

    eventBus.addListener(
      SyncStorage.EVENTS.ACCOUNT_DISABLED,
      this[PRIVATE.onAccountDisabled],
      this
    )

    eventBus.addListener(
      SyncStorage.EVENTS.ACCOUNT_REMOVED,
      this[PRIVATE.onAccountRemoved],
      this
    )
  }

  /**
   * Returns the constants containing the names of the event bus events fired
   * by this accounts synchronizer.
   *
   * @return The constants containing the names of the event bus events fired
   *         by this accounts synchronizer.
   */
  static get EVENTS(): {
    ACCOUNT_ADDED: string
  } {
    const eventPrefix = "background.storage.synchronization.EVENTS."
    return Object.freeze({
      ACCOUNT_ADDED: `${eventPrefix}ACCOUNT_ADDED`
    })
  }

  async [PRIVATE.onAccountAdded](accountInfo: {id: string}) {
    let accountId = accountInfo.id
    let apiClient = PRIVATE(this).clientFactory.getClientForUser(accountId)
    let entityManager = PRIVATE(this).database.createEntityManager()

    // TODO: check if the account is enabled in the sync storage

    let currentAccountId = await this[PRIVATE.getCurrentAccountId]()
    if (accountId !== currentAccountId) {
      // Chrome did not allow access to multiple Google accounts from a single
      // browser instance at the time of implementation.
      await entityManager.persist(new Account({
        id: accountId,
        channelId: null,
        title: null,
        state: null, // TODO
        lastError: null,
        watchHistoryPlaylistId: null,
        watchLaterPlaylistId: null
      }))
      return
    }

    /*
     * TODO: what if the account has been added through synchronization and not
     * interactively? check (or request) authorization?
     */
    let account = await apiClient.getAccountInfo(accountId)

    await entityManager.persist(account)

    PRIVATE(this).eventBus.fire(
      AccountsSynchronizer.EVENTS.ACCOUNT_ADDED, account
    )
  }

  [PRIVATE.onAccountEnabled](accountInfo: {id: string}) {
    throw new Error("Not implemented yet")
  }

  [PRIVATE.onAccountDisabled](accountInfo: {id: string}) {
    throw new Error("Not implemented yet")
  }

  [PRIVATE.onAccountRemoved](accountInfo: {id: string}) {
    throw new Error("Not implemented yet")
  }

  [PRIVATE.getCurrentAccountId](): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        }

        resolve(userInfo.id)
      })
    })
  }
}
