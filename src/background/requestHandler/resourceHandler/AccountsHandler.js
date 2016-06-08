
import createPrivate from "namespace-proxy"
import AbstractHandler from "./AbstractHandler"
import Database from "../../storage/Database"
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
   */
  constructor(database: Database) {
    super()

    /**
     * The database connection.
     * 
     * @type {Database}
     */
    PRIVATE(this).database = database

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
    entityManager.close()
    return accounts
  }
}
