
import createPrivate from "../../createPrivate"
import Account from "../../model/Account"
import Subscription from "../../model/Subscription"
import Database from "../storage/Database"
import ClientFactory from "../youtube-api/ClientFactory"

const PRIVATE = createPrivate()

/**
 * Utility for fetching and updating the list of subscribed channels of a
 * single user's Google account.
 */
export default class SubscriptionsFetcher {
  constructor(database: Database, clientFactory: ClientFactory) {
    /**
     * The current database connection provider.
     *
     * @type {Database}
     */
    PRIVATE(this).database = database

    /**
     * YouTube API client factory.
     *
     * @type {ClientFactory}
     */
    PRIVATE(this).clientFactory = clientFactory
  }

  async updateSubscriptions(account: Account): void {
    if (!account.channelId) {
      throw new Error("Cannot read the subscription of a foreign account, " +
          "because the channel ID is not known")
    }

    let client = PRIVATE(this).clientFactory.getClientForUser(account.id)
    let subscriptions
    try {
      subscriptions = await client.getSubscriptions(account)
    } catch (error) {
      console.warn("Failed to fetch the subscriptions list without user's " +
          "authorization", error)
      subscriptions = await client.getSubscriptions(account, true)
    }

    let entityManager = PRIVATE(this).database.createEntityManager()
    entityManager.runTransaction(async () => {
      let currentSubscriptionsList = await entityManager.query(
        Subscription,
        {
          isIncognito: 0,
          accountId: account.id
        }
      )
      let currentSubscriptions = new Map(currentSubscriptionsList.map(
        subscription => [subscription.channelId, subscription]
      ))

      for (let [subscription, channel] of subscriptions) {
        let currentSubscription = currentSubscriptions.get(channel.id)
        // TODO
      }
    })
  }
}
