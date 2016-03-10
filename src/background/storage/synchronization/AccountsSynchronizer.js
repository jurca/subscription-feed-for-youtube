
import createPrivate from "../../../createPrivate"
import EventBus from "../../../EventBus"
import Lock from "../../../Lock"
import Account from "../../../model/Account"
import AccountState from "../../../model/AccountState"
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
   * @param syncStorage The synchronized settings storage.
   * @param database The Indexed DB database connection.
   */
  constructor(eventBus: EventBus, clientFactory: ClientFactory,
      syncStorage: SyncStorage, database: Database) {
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
     * The synchronized settings storage.
     */
    PRIVATE(this).syncStorage = syncStorage

    /**
     * The Indexed DB database connection.
     */
    PRIVATE(this).database = database

    /**
     * Lock for synchronizing the processing of accounts modifications.
     */
    PRIVATE(this).accountsLock = new Lock()

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

    Object.freeze(this)
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

  /**
   * Handles an account being added to the synchronized storage. The method
   * retrieves the related account info (if possible) and creates the account's
   * entity in the database.
   *
   * @param accountInfo Received information about the account.
   */
  async [PRIVATE.onAccountAdded](accountInfo: {id: string}): void {
    let accountId = accountInfo.id
    let apiClient = PRIVATE(this).clientFactory.getClientForUser(accountId)
    let entityManager = PRIVATE(this).database.createEntityManager()

    return await PRIVATE(this).accountsLock.lock(async () => {
      let accountEnabled = await this[PRIVATE.isAccountEnabled](accountId)
      if (accountEnabled === null) {
        console.warn(`The account with ID ${accountId} was added but has ` +
            "already been removed from the synchronized storage")
        return
      }
      let state = accountEnabled ?
          AccountState.UNAUTHORIZED :
          AccountState.DISABLED

      let currentAccountId = await this[PRIVATE.getCurrentAccountId]()
      if (accountId !== currentAccountId) {
        // Chrome did not allow access to multiple Google accounts from a
        // single browser instance at the time of implementation.
        await entityManager.persist(this[PRIVATE.getBlankAccountEntity](
          accountId,
          state
        ))
        return
      }

      let account
      try {
        account = await apiClient.getAccountInfo(accountId)
      } catch (error) {
        if (error.name !== "OAuthError") {
          throw error
        }

        // the account is not authorized, it was most likely added through the
        // settings synchronization
        await entityManager.persist(this[PRIVATE.getBlankAccountEntity](
          accountId,
          state
        ))
        return
      }

      if (!accountEnabled) {
        account.state = AccountState.DISABLED
      }
      await entityManager.persist(account)

      PRIVATE(this).eventBus.fire(
        AccountsSynchronizer.EVENTS.ACCOUNT_ADDED, account
      )
    })
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

  /**
   * Creates a new, blank, Google account entity for an account of the
   * specified ID and state.
   *
   * @param id The account's ID.
   * @param state The account's state.
   * @return The created (mostly) blank account entity.
   */
  [PRIVATE.getBlankAccountEntity](id: string, state: string): Account {
    return new Account({
      id,
      channelId: null,
      title: null,
      state,
      lastError: null,
      watchHistoryPlaylistId: null,
      watchLaterPlaylistId: null
    })
  }

  /**
   * Determines whether the specified account is enabled. Returns {@code null}
   * if the specified account is not among the accounts in the synchronized
   * storage.
   *
   * @param accountId The ID of the Google account.
   * @return {@code true} if the account is enabled, {@code false} if the
   *         account is disabled, or {@code null} if the account is not
   *         currently managed by the extension.
   */
  async [PRIVATE.isAccountEnabled](accountId: string): ?boolean {
    let accounts = await PRIVATE(this).syncStorage.getAccounts()
    let accountDetails = accounts.filter((account) => {
      return account.account === accountId
    })[0]

    return accountDetails && accountDetails.enabled
  }

  /**
   * Returns the ID of the user's current Google account.
   *
   * @return A promise that resolves to the ID of the user's current Google
   *         account.
   */
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
