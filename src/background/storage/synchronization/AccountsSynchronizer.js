
import createPrivate from "namespace-proxy"
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
    ACCOUNT_ADDED: string,
    ACCOUNT_ENABLED: string
  } {
    const eventPrefix = "background.storage.synchronization.EVENTS."
    return Object.freeze({
      ACCOUNT_ADDED: `${eventPrefix}ACCOUNT_ADDED`,
      ACCOUNT_ENABLED: `${eventPrefix}ACCOUNT_ENABLED`
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

      let currentAccountInfo = await this[PRIVATE.getCurrentAccountInfo]()
      if (accountId !== currentAccountInfo.id) {
        // Chrome did not allow access to multiple Google accounts from a
        // single browser instance at the time of implementation.
        await entityManager.persist(this[PRIVATE.getBlankAccountEntity](
          accountId,
          state,
          currentAccountInfo.email
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
          state,
          currentAccountInfo.email
        ))
        return
      }

      account.title = currentAccountInfo.email
      if (!accountEnabled) {
        account.state = AccountState.DISABLED
      }
      await entityManager.persist(account)

      PRIVATE(this).eventBus.fire(
        AccountsSynchronizer.EVENTS.ACCOUNT_ADDED, account
      )
    })
  }

  /**
   * Handles an account being enabled in the synchronized storage. The method
   * updates the account's entity in the database.
   *
   * @param accountInfo Information about the account that has been enabled.
   */
  async [PRIVATE.onAccountEnabled](accountInfo: {id: string}): void {
    let accountId = accountInfo.id
    let entityManager = PRIVATE(this).database.createEntityManager()

    let account

    await PRIVATE(this).accountsLock.lock(async () => {
      return await entityManager.runTransaction(async () => {
        account = await entityManager.find(Account, accountId)
        if (!account) {
          throw new Error(`The account with ID ${accountId} was marked as ` +
              "enabled in the synchronized storage, but is no longer in the " +
              "database")
        }

        account.state = AccountState.ACTIVE
      })
    })

    PRIVATE(this).eventBus.fire(
      AccountsSynchronizer.EVENTS.ACCOUNT_ENABLED, account
    )
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
   * @param title The account's title (e-mail address), if available.
   * @return The created (mostly) blank account entity.
   */
  [PRIVATE.getBlankAccountEntity](id: string, state: string,
      title: ?string = null): Account {
    return new Account({
      id,
      channelId: null,
      title,
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
   * Returns the information about the user's current Google account.
   *
   * @return A promise that resolves to the information about the user's
   *         current Google account.
   */
  [PRIVATE.getCurrentAccountInfo](): Promise<{id: string, email: string}> {
    return new Promise((resolve, reject) => {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        }

        resolve(userInfo)
      })
    })
  }
}
