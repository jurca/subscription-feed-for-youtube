
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

  /**
   * Updates the subscriptions, subscribed channels and their uploads playlists
   * of the of the provided account.
   *
   * @param account The user's Google account.
   */
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
      await this[PRIVATE.processSubscriptions](entityManager, allSubscriptions)
    })
  }

  /**
   * Processes all the provided subscriptions of the user's account, storing
   * the new, updating the existing and deleting the removed subscriptions from
   * the local database.
   *
   * @param entityManager The current entity manager in a transaction used to
   *        update the subscriptions.
   * @param allSubscriptions All current subscriptions of the user's Google
   *        account, freshly fetched from the YouTube's data API.
   */
  async [PRIVATE.processSubscriptions](entityManager: EntityManager,
      allSubscriptions: Array<[Subscription, Channel]>): void {
    let knownSubscriptions = await this[PRIVATE.fetchSubscriptions](
      entityManager,
      account
    )

    for (let [subscription, channel] of allSubscriptions) {
      await this[PRIVATE.processSubscription](
        entityManager,
        subscription,
        channel
      )

      knownSubscriptions.delete(channel.id)
    }

    // delete subscriptions that were removed from the account
    for (let [channelId, subscription] of knownSubscriptions) {
      await this[PRIVATE.deleteUnsubsribedSubscription](
        entityManager,
        channelId,
        subscription
      )
    }
  }

  /**
   * Processes the provided subscription, adding it to the subscriptions in the
   * database if not already present, and checking, updating and saving the
   * related channel and uploads playlist.
   *
   * @param entityManager The current entity manager in a transaction used to
   *        update the subscriptions.
   * @param knownSubscriptions A map of channel IDs to subscriptions to the
   *        channels.
   * @param subscription The subscription to the channel.
   * @param channel The channel to which the user is subscribed.
   */
  async [PRIVATE.processSubscription](entityManager: EntityManager,
      knownSubscriptions: Map<string, Subscription>,
      subscription: Subscription, channel: Channel): void {
    // save new subscriptions
    if (!knownSubscriptions.has(channel.id)) {
      await entityManager.persist(subscription)
    }

    let {knownChannel, playlist} = await this[PRIVATE.prepareSubscription](
      entityManager,
      channel
    )

    // update existing subscriptions
    this[PRIVATE.updateKnownSubscription](
      entityManager,
      account,
      knownChannel,
      playlist
    )
  }

  /**
   * Prepares the channel and playlist entities for the subscription to the
   * specified channel.
   *
   * @param entityManager The current entity manager in a transaction used to
   *        update the subscriptions.
   * @param channel The entity representing the channel for which the
   *        subscription is being prepared.
   * @return The channel entity representing the provided channel within this
   *         extension's database.
   */
  async [PRIVATE.prepareSubscription](entityManager: EntityManager,
      channel: Channel): {knownChannel: Channel, playlist: Playlist} {
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

    return {
      knownChannel,
      playlist
    }
  }

  /**
   * Updates, if necessary, the provided channel and its uploads playlist to
   * which the specified account is subscribed to. The method updates the
   * account IDs list of the channel and playlist by adding the account's ID if
   * the account ID is not already present in the lists.
   *
   * Updating the account IDs list of the playlist also triggers check&update
   * of account IDs lists of the videos in the playlist.
   *
   * @param entityManager The current entity manager in a transaction used to
   *        update the subscriptions.
   * @param account The account that subscribes to the channel.
   * @param channel The channel the account is subscribed to.
   * @param playlist The uploads playlist of the subscribed channel.
   */
  async [PRIVATE.updateKnownSubscription](entityManager: EntityManager,
      account: Account, channel: Channel, playlist: Playlist): void {
    if (!channel.accountIds.includes(account.id)) {
      channel.accountIds.push(account.id)
    }

    if (playlist.accountIds.includes(account.id)) {
      return
    }

    playlist.accountIds.push(account.id)
    let videos = await entityManager.query(Video, {
      channelId: channel.id
    })
    for (let video of videos) {
      // the condition should always hold true, but... just in case ;)
      if (!video.accountIds.includes(account.id)) {
        video.accountIds.push(account.id)
      }
    }
  }

  /**
   * Deletes the provided subscription, which the user is no longer subscribed
   * to.
   *
   * The method also updates the account IDs of the subscribed channel, uploads
   * playlist and videos. If any of those will no longer be subscribed by any
   * account or incognito subscription, they will be deleted.
   *
   * @param entityManager The current entity manager in a transaction used to
   *        update the subscriptions.
   * @param channelId The ID of the channel that has been unsubscribed
   * @param subscriptions The subscription that should be deleted.
   */
  async [PRIVATE.deleteUnsubsribedSubscription](
    entityManager: EntityManager,
    channelId: string,
    subscriptions: Subscription
  ): void {
    // update and delete (if necessary) the channel
    let channel = await entityManager.find(Channel, channelId)
    channel.accountIds = channel.accountIds.filter(
      otherAccountId => otherAccountId !== account.id
    )
    let shouldDeleteChannel =
        !channel.accountIds.length &&
        !channel.incognitoSubscriptionIds.length
    if (shouldDeleteChannel) {
      entityManager.remove(Channel, channel.id)
    }

    // update and delete (if necessary) the playlist
    let playlist = await entityManager.find(
      Playlist,
      channel.uploadsPlaylistId
    )
    playlist.accountIds = playlist.accountIds.filter(
      otherAccountId => otherAccountId !== account.id
    )
    let shouldDeletePlaylist =
        !playlist.accountIds.length &&
        !playlist.incognitoSubscriptionIds.length
    if (shouldDeletePlaylist) {
      entityManager.remove(Playlist, playlist.id)
    }

    // updated and delete (if necessary) the videos
    let videos = await entityManager.query(Video, {
      channelId: channelId
    })
    for (let video of videos) {
      video.accountIds = video.accountIds.filter(
        otherAccountId => otherAccountId !== account.id
      )
      let shouldDeleteVideo =
          !video.accountIds.length &&
          !video.incognitoSubscriptionIds.length
      if (shouldDeleteVideo) {
        entityManager.remove(Video, video.id)
      }
    }

    // delete the subscription
    entityManager.remove(Subscription, subscriptions.id)
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
