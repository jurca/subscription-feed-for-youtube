
import createPrivate from "namespace-proxy"
import AbstractHandler from "./AbstractHandler"
import Database from "../../storage/Database"
import PortReceiver from "../../PortReceiver"
import Account from "../../../model/Account"

const MAX_AUTHORIZATION_RETRIES = 3
const AUTHORIZATION_RETRY_DELAY = 1000

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
   */
  constructor(database: Database, portReceiver: PortReceiver) {
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
  
      // TODO: store the current account in the SyncStorage, observe the
      // following synchronization and fetching of subscriptions and videos
      port.disconnect()
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
