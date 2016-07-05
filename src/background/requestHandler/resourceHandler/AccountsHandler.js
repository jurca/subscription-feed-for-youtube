
import createPrivate from "namespace-proxy"
import AbstractHandler from "./AbstractHandler"
import Database from "../../storage/Database"
import PortReceiver from "../../PortReceiver"
import Account from "../../../model/Account"

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

  async create(data: {portName: string}): any {
    let port = await PRIVATE(this).portReceiver.getPort(data.portName)
    setTimeout(() => {
      port.postMessage({ msg: "connected! "})
    }, 1000)
    port.onMessage.addListener((message) => {
      console.log(message)
      port.postMessage({ msg2: "disconnnecting..." })
      port.disconnect()
    })
    return "OK..."
  }
}
