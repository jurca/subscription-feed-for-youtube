
import EntityManager from "idb-entity/es2015/EntityManager"
import createPrivate from "namespace-proxy"
import Account from "../../model/Account"
import Channel from "../../model/Channel"
import Playlist from "../../model/Playlist"
import Video from "../../model/Video"
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

    let allSubscriptions = await this[PRIVATE.fetchCurrentSubscriptions](
      account
    )

    let entityManager = PRIVATE(this).database.createEntityManager()
    entityManager.runTransaction(async () => {
      let knownSubscriptions = await this[PRIVATE.fetchSubscriptions](
        entityManager,
        account
      )

      for (let [subscription, channel] of allSubscriptions) {
        // save new subscriptions
        let knownSubscription = knownSubscriptions.get(channel.id)
        if (!knownSubscription) {
          knownSubscription = await entityManager.persist(subscription)
        }

        let knownChannel = await entityManager.find(Channel, channel.id)
        if (!knownChannel) {
          knownChannel = await entityManager.persist(channel)
        }
        let playlist = await entityManager.find(
            Playlist,
            knownChannel.uploadsPlaylistId
        )
        if (!playlist) {
          playlist = await this[PRIVATE.fetchUploadsPlaylist](channel)
          playlist = await entityManager.persist(playlist)
        }

        // update existing subscriptions
        if (!knownChannel.accountIds.includes(account.id)) {
          knownChannel.accountIds.push(account.id)
        }
        if (!playlist.accountIds.includes(account.id)) {
          playlist.accountIds.push(account.id)
          let videos = await entityManager.query(Video, {
            channelId: knownChannel.id
          })
          for (let video of videos) {
            if (!video.accountIds.includes(account.id)) {
              video.accountIds.push(account.id)
            }
          }
        }

        knownSubscriptions.delete(channel.id)
      }

      // delete subscriptions that were removed from the account
      for (let [channelId, subscription] of knownSubscriptions) {
        let isStillSubscribed = false
        for (let [currentSubscription, currentChannel] of allSubscriptions) {
          if (channelId === currentChannel.id) {
            isStillSubscribed = true
          }
        }
        if (isStillSubscribed) {
          continue
        }

        let channel = await entityManager.find(Channel, channelId)
        channel.accountIds = channel.accountIds.filter(
          otherAccountId => otherAccountId !== account.id
        )
        let playlist = await entityManager.find(
            Playlist,
            channel.uploadsPlaylistId
        )
        playlist.accountIds = playlist.accountIds.filter(
          otherAccountId => otherAccountId !== account.id
        )
        let videos = await entityManager.query(Video, {
          channelId: channelId
        })
        for (let video of videos) {
          video.accountIds = video.accountIds.filter(
            otherAccountId => otherAccountId !== account.id
          )
        }
        // TODO: delete channels, playlists and videos that are no longer subscribed
      }
    })
  }

  /**
   * Fetches the uploads playlist entity from the YouTube API for the specified
   * channel.
   *
   * @param channel The YouTube channel for which the uploads playlist should
   *        be fetched.
   * @return The fetched playlist entity.
   */
  async [PRIVATE.fetchUploadsPlaylist](channel: Channel): Playlist {
    let client = PRIVATE(this).clientFactory.getClientForUser(channel.id)
    let playlists = await client.getUploadsPlaylists([channel])
    return playlists[0]
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
