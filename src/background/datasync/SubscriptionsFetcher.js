
import EntityManager from "idb-entity/es2015/EntityManager"
import createPrivate from "namespace-proxy"
import Account from "../../model/Account"
import Channel from "../../model/Channel"
import Subscription from "../../model/Subscription"
import Database from "../storage/Database"
import ClientFactory from "../youtube-api/ClientFactory"

const PRIVATE = createPrivate()

/**
 * Utility for fetching and updating the list of subscribed channels of a
 * single user's Google account.
 */
export default class SubscriptionsFetcher {
  /**
   * Initializes the subscription fetcher.
   *
   * @param database The current database connection provider.
   * @param clientFactory YouTube API client factory.
   */
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

    let subscriptions = await this[PRIVATE.fetchCurrentSubscriptions](account)

    let entityManager = PRIVATE(this).database.createEntityManager()
    entityManager.runTransaction(async () => {
      let currentSubscriptions = await this[PRIVATE.fetchSubscriptions](
        entityManager,
        account
      )

      for (let [subscription, channel] of subscriptions) {
        let currentSubscription = currentSubscriptions.get(channel.id)
        let currentChannel = await entityManager.find(Channel, channel.id)

        if (!currentSubscription) {
          currentSubscription = await entityManager.persist(subscription)
        }
        if (!currentChannel) {
          currentChannel = await entityManager.persist(channel)
          // TODO: fetch and save the playlist
        }

        if (!currentChannel.accountIds.includes(account.id)) {
          // TODO: update channel, uploads playlist and videos
        }

        currentSubscriptions.delete(channel.id)
      }

      // TODO: delete remaining subscriptions
    })
  }

  /**
   * Fetches the currently known subscriptions of the specified Google account
   * from the local Indexed DB database.
   *
   * @param entityManager The entity manager representing the connection to the
   *        database.
   * @param account The Google account.
   * @return The map of subscribed channel IDs to the subscription entities.
   */
  async [PRIVATE.fetchSubscriptions](entityManager: EntityManager,
      account: Account): Map<string, Subscription> {
    let currentSubscriptionsList = await entityManager.query(
      Subscription,
      {
        isIncognito: 0,
        accountId: account.id
      }
    )
    return new Map(currentSubscriptionsList.map(
      subscription => [subscription.channelId, subscription]
    ))
  }

  /**
   * Fetches the current list of the specified Google account's subscriptions
   * from the YouTube API.
   * 
   * The method will attempt to fetch the list without the user's authorization
   * if possible first, and use the user's authorization if the unauthorized
   * attempt fails.
   * 
   * @param account The Google account for which to fetch the subscriptions.
   * @return The current list of account's subscriptions and the subscribed
   *         channels as returned by the YouTube API.
   */
  async [PRIVATE.fetchCurrentSubscriptions](account: Account):
      Array<[Subscription, Channel]> {
    let client = PRIVATE(this).clientFactory.getClientForUser(account.id)
    try {
      return await client.getSubscriptions(account)
    } catch (error) {
      console.warn("Failed to fetch the subscriptions list without user's " +
          "authorization", error)
      return await client.getSubscriptions(account, true)
    }
  }
}
