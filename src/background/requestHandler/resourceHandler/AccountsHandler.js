
import createPrivate from "namespace-proxy"
import EventBus from "../../../EventBus"
import Account from "../../../model/Account"
import PortReceiver from "../../PortReceiver"
import Database from "../../storage/Database"
import SyncStorage from "../../storage/SyncStorage"
import AccountsSynchronizer from "../../storage/synchronization/AccountsSynchronizer"
import AbstractHandler from "./AbstractHandler"

const MAX_AUTHORIZATION_RETRIES = 3
const AUTHORIZATION_RETRY_DELAY = 1000
const EVENT_AWAIT_TIMEOUT = 2000

const PRIVATE = createPrivate()

/**
 * Resource handler for the {@code accounts} resource.
 */
export default class AccountsHandler extends AbstractHandler {
  /**
   * Initializes the accounts resource handler.
   * 
   * @param database The database connection.
   * @param portReceiver Receiver of incoming port connections.
   * @param syncStorage The cross-device synchronized storage, used as the
   *        primary storage of account IDs and incognito subscriptions.
   * @param eventBus The application's event bus for undirected communication
   *        between application's parts.
   */
  constructor(database: Database, portReceiver: PortReceiver,
      syncStorage: SyncStorage, eventBus: EventBus) {
    super()

    /**
     * The database connection.
     * 
     * @type {Database}
     */
    PRIVATE(this).database = database

    /**
     * Receiver of incoming port connections.
     *
     * @type {PortReceiver}
     */
    PRIVATE(this).portReceiver = portReceiver

    /**
     * The cross-device synchronized storage, used as the primary storage of
     * account IDs and incognito subscriptions.
     *
     * @type {SyncStorage}
     */
    PRIVATE(this).syncStorage = syncStorage

    /**
     * The application's event bus for undirected communication between
     * application's parts.
     *
     * @type {EventBus}
     */
    PRIVATE(this).eventBus = eventBus

    Object.freeze(this)
  }

  get resourceName(): string {
    return "accounts"
  }

  async list(
    parameters: Object<string, (number|string|number[]|string[])>
  ): Array<Account> {
    let entityManager = PRIVATE(this).database.createEntityManager()
    let accounts = await entityManager.query(Account, null, "title")
    return accounts
  }

  async create(data: {portName: string}): void {
    let port = await PRIVATE(this).portReceiver.getPort(data.portName)

    setTimeout(async () => {
      try {
        await this[PRIVATE.requestOAuthAuthorization]()
        port.postMessage({ state: "AUTHORIZED" })
      } catch (error) {
        console.error(error)
        port.postMessage({ state: "AUTHORIZATION_REJECTED" })
        port.disconnect()
        return
      }
  
      let accountId = await this[PRIVATE.getCurrentAccountId]()
      await PRIVATE(this).syncStorage.addAccount(accountId)

      let eventBus = PRIVATE(this).eventBus
      try {
        // Note: technically, we should check the account id to be sure we are
        // tracking the right account being added, but Chrome does not allow us
        // to manage multiple Google accounts at the moment of writing this.
        port.postMessage({ state: "FETCHING_PROFILE_INFO" })
        await eventBus.awaitEvent(
          AccountsSynchronizer.EVENTS.ACCOUNT_ADDED,
          EVENT_AWAIT_TIMEOUT
        )
        port.postMessage({ state: "ADDED" })
      } catch (error) {
        console.error(error)
      } finally {
        port.disconnect()
      }
    })
  }

  /**
   * Returns the GAIA ID of the current user's Google account.
   *
   * @return The GAIA ID of the current user's Google account.
   */
  async [PRIVATE.getCurrentAccountId](): string {
    return new Promise((resolve, reject) => {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        }

        resolve(userInfo.id)
      })
    })
  }

  /**
   * Requests OAuth2 authorization from the current user to access the user's
   * YouTube account and details used by this extension.
   */
  async [PRIVATE.requestOAuthAuthorization](): void {
    let triesLeft = MAX_AUTHORIZATION_RETRIES
    let errorMessage = ""
    return await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({
        interactive: true
      }, (token) => {
        if (typeof token === "string") {
          resolve()
          return
        }

        console.warn("We did not receive an OAuth authorization token, but " +
            "this might be due to how OAuth works in Chrome, retrying in " +
            `${AUTHORIZATION_RETRY_DELAY} milliseconds (${triesLeft} tries ` +
            "left)")
        if (chrome.runtime.lastError) {
          errorMessage = chrome.runtime.lastError.message
        }
        setTimeout(retryNonInteractively, AUTHORIZATION_RETRY_DELAY)
      })

      function retryNonInteractively() {
        chrome.identity.getAuthToken({}, (token) => {
          if (typeof token === "string") {
            resolve()
            return
          }

          triesLeft--
          if (triesLeft) {
            console.warn("We did not receive an OAuth authorization token, " +
                "but this might be due to how OAuth works in Chrome, " +
                `retrying in ${AUTHORIZATION_RETRY_DELAY} milliseconds ` +
                `(${triesLeft} tries left)`)
            setTimeout(retryNonInteractively, AUTHORIZATION_RETRY_DELAY)
          } else {
            let rejectionError = new Error("OAuth authorization failed: " +
                errorMessage ? errorMessage : "unknown reason")
            rejectionError.name = "OAuthError"
            reject(rejectionError)
          }
        })
      }
    })
  }
}
