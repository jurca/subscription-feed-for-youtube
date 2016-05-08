
import YouTubeApiClient from "sf4yt-gapi-client/es2015/YouTubeApiClient"
import createPrivate from "namespace-proxy"
import Account from "../../model/Account"
import AccountState from "../../model/AccountState"
import Channel from "../../model/Channel"
import Playlist from "../../model/Playlist"
import Subscription from "../../model/Subscription"
import SubscriptionState from "../../model/SubscriptionState"
import SubscriptionType from "../../model/SubscriptionType"
import Video from "../../model/Video"

const PRIVATE = createPrivate()

/**
 * Client for communication with the YouTube API using the identity of a single
 * specific Google user.
 */
export default class Client {
  /**
   * Initializes the client.
   *
   * @param apiClient The YouTube API client to use for communication with the
   *        YouTube data API.
   */
  constructor(apiClient: YouTubeApiClient) {
    PRIVATE(this).apiClient = apiClient
  }

  /**
   * Retrieves the information about the specified YouTube account, or the
   * account that is currently authorized using OAuth2.
   *
   * @param accountId The current user's Google account ID.
   * @param channelId The YouTube channelID.
   * @return An entity representing the YouTube account.
   */
  async getAccountInfo(accountId: string, channelId: ?string = null): Account {
    let accountData = await PRIVATE(this).apiClient.getAccountInfo(channelId)
    return new Account({
      id: accountId,
      channelId: accountData.id,
      title: accountData.title,
      state: AccountState.ACTIVE,
      lastError: null,
      watchHistoryPlaylistId: accountData.playlistIds.watchHistory,
      watchLaterPlaylistId: accountData.playlistIds.watchLater
    })
  }

  /**
   * Fetches the channels to which the specified YouTube account is subscribed.
   *
   * @param account The YouTube account for which the subscribed channels
   *        should be retrieved.
   * @param authorized Whether or not OAuth2 authorization should be used to
   *        fetch the list of subscribed channels.
   * @return The channel and subscription entities representing the channels to
   *         which the specified account is subscribed to.
   */
  async getSubscriptions(account: Account, authorized: boolean = false):
      Array<[Subscription, Channel]> {
    let apiClient = PRIVATE(this).apiClient
    let channels = await apiClient.getSubscribedChannels(
      account.channelId,
      authorized
    )
    let channelIds = channels.map(channel => channel.id)

    let uploadPlaylistIds = await apiClient.getUploadsPlaylistIds(
      channelIds
    )
    let playlistIdsMap = new Map()
    for (let playlistId of uploadPlaylistIds) {
      playlistIdsMap.set(playlistId.id, playlistId.uploadsPlaylistId)
    }

    for (let channel of channels) {
      channel.uploadsPlaylistId = playlistIdsMap.get(channel.id)
    }

    return channels.map((channel) => {
      return [
        new Subscription({
          type: SubscriptionType.CHANNEL,
          playlistId: channel.uploadsPlaylistId,
          channelId: channel.id,
          state: SubscriptionState.ACTIVE,
          lastError: null,
          accountId: account.id,
          isIncognito: 0
        }),
        new Channel({
          id: channel.id,
          title: channel.title,
          thumbnails: channel.thumbnails,
          uploadsPlaylistId: channel.uploadsPlaylistId,
          accountIds: [account.id],
          incognitoSubscriptionIds: []
        })
      ]
    })
  }

  /**
   * Fetches the playlist of uploaded videos for every specified channel.
   *
   * @param channels The channels for which the playlists should be fetched.
   * @return The playlists of videos uploaded by the specified channels.
   */
  async getUploadsPlaylists(channels: Array<Channel>): Array<Playlist> {
    let playlistToChannel = new Map()
    for (let channel of channels) {
      playlistToChannel.set(channel.uploadsPlaylistId, channel)
    }

    let playlistIds = channels.map(channel => channel.uploadsPlaylistId)
    let playlists = await PRIVATE(this).apiClient.getPlaylists(playlistIds)

    return playlists.map((playlist) => {
      let channel = playlistToChannel.get(playlist.id)
      return new Playlist({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        videoCount: playlist.videoCount,
        thumbnails: playlist.videoCount,
        accountIds: channel.accountIds.slice(),
        incognitoSubscriptionIds: []
      })
    })
  }

  /**
   * Resolves the detail of the specified incognito subscription.
   *
   * @param type
   * @param resourceId
   * @return Entities representing the subscription.
   */
  async getIncognitoSubscriptionDetails(type: string, resourceId: string):
      [Subscription, Playlist, Channel] {
    let apiClient = PRIVATE(this).apiClient
    let playlistId
    switch (type) {
      case SubscriptionType.CHANNEL:
        playlistId = await apiClient.getUploadsPlaylistId(resourceId)
        break
      case SubscriptionType.PLAYLIST:
        playlistId = resourceId
        break
      default:
        throw new Error(`Unknown subscription type: ${type}`)
    }

    let playlistInfo = await apiClient.getPlaylistInfo(playlistId)
    let channelId = playlistInfo.channelId
    let channelInfo = await apiClient.getChannelInfo(channelId)

    return PRIVATE.toIncognitoSubscriptionInfo(
      type,
      channelInfo,
      playlistInfo
    )
  }

  /**
   * Resolves the provided URL to the basic information about an incognito
   * subscription.
   *
   * @param url The URL to a YouTube channel, user or a playlist.
   * @return Basic information about the incognito subscription. The type is
   *         one of the {@linkcode SubscriptionType.*} constants.
   */
  async resolveIncognitoSubscription(url: string):
      {type: string, resourceId: string} {
    let validator =
        /^https:\/\/www\.youtube\.com\/(channel\/|user\/|playlist\?(.+&)?list=|watch\?(.+&)?list=).+$/
    if (!validator.test(url)) {
      throw new Error("Invalid user, channel or playlist URL")
    }

    let channelId = null
    let userMatcher = /^https:\/\/www\.youtube\.com\/user\/([^/]+)$/
    let channelMatcher = /^https:\/\/www\.youtube\.com\/channel\/([^/]+)$/
    if (userMatcher.test(url)) {
      let username = decodeURIComponent(userMatcher.exec(url)[1])
      channelId = await PRIVATE(this).apiClient.getUserChannelId(username)
    } else if (channelMatcher.test(url)) {
      channelId = decodeURIComponent(channelMatcher.exec(url)[1])
    }
    if (channelId) {
      return {
        type: SubscriptionType.CHANNEL,
        resourceId: channelId
      }
    }

    let playlistMatcher =
        /^https:\/\/www\.youtube\.com\/(?:playlist|watch)\?(?:.+&)?list=([^&]+)(?:&.+)?$/
    let playlistId = decodeURIComponent(playlistMatcher.exec(url)[1])
    return {
      type: SubscriptionType.PLAYLIST,
      resourceId: playlistId
    }
  }

  /**
   * Filters the provided playlists for playlists that contain new (or at least
   * more than they used to) videos. The playlists matching the criteria will
   * have their video counts and thumbnails updated.
   *
   * This method cannot be used with private playlists.
   *
   * @param playlists The playlists to check for new videos.
   * @return The updated playlists that contain new videos.
   */
  async getPlaylistsWithNewContent(playlists: Array<Playlist>):
      Array<Playlist> {
    let playlistsMap = new Map()
    for (let playlist of playlists) {
      playlistsMap.set(playlist.id, playlist)
    }

    let playlistIds = Array.from(playlistsMap.keys())
    let apiClient = PRIVATE(this).apiClient
    let videoCounts = await apiClient.getPlaylistVideoCounts(playlistIds)

    let updated = new Map()
    for (let videoCount of videoCounts) {
      let playlist = playlistsMap.get(videoCount.id)
      if (playlist.videoCount !== videoCount.videoCount) {
        playlist.videoCount = videoCount.videoCount
        updated.set(playlist.id, playlist)
      }
    }

    let updatedIds = Array.from(updated.keys())
    let newThumbnails = await apiClient.getPlaylistThumbnails(updatedIds)
    for (let thumbnails of newThumbnails) {
      let playlist = updated.get(thumbnails.id)
      playlist.thumbnails = thumbnails.thumbnails
    }

    return Array.from(updated.values())
  }

  /**
   * Fetches the new videos from the specified playlist that are not among the
   * specified videos.
   *
   * @param playlist The playlist from which the videos should be fetched.
   * @param knownVideos The videos that are already known to be present in the
   *        playlist.
   * @param authorized Flag signalling whether a request authorized by the
   *        current user should be made. This is required for fetching videos
   *        from private playlists, for example the user's watch history
   *        playlist or the user's watch later playlist.
   * @return The new videos.
   */
  async getNewPlaylistVideos(playlist: Playlist, knownVideos: Array<Video>,
      authorized: boolean = false): Array<Video> {
    if (knownVideos.length === playlist.videoCount) {
      return []
    }

    let knownVideoIds = new Set(knownVideos.map(video => video.id))
    let newVideosCount = playlist.videoCount - knownVideos.length

    let apiClient = PRIVATE(this).apiClient
    let videos = await apiClient.getPlaylistVideos(playlist.id, (videos) => {
      for (let video of videos) {
        let videoId = video.id
        if (knownVideoIds.has(videoId)) {
          newVideosCount--
        }
        if (!newVideosCount) {
          break
        }
      }

      return !!newVideosCount
    }, authorized)
    let newVideos = videos.filter(video => !knownVideoIds.has(video.id))
    let videoEntities = new Map()
    for (let video of newVideos) {
      videoEntities.set(video.id, new Video(Object.assign({}, video, {
        duration: -1,
        viewCount: -1,
        accountIds: playlist.accountIds.slice(),
        incognitoSubscriptionIds: playlist.incognitoSubscriptionIds.slice(),
        watched: 0,
        isEnabled: 0, // the flag will be set afterwards
        lastUpdate: new Date(0)
      })))
    }

    let newVideoIds = Array.from(videoEntities.keys())
    let metadata = await apiClient.getVideosMetaData(newVideoIds)
    for (let data of metadata) {
      let entity = videoEntities.get(data.id)
      entity.duration = data.duration
      entity.viewCount = data.viewCount
      entity.lastUpdate = new Date()
    }

    return Array.from(videoEntities.values())
  }

  /**
   * Updates the video views count of the provided videos. This method cannot
   * be used with private videos.
   *
   * @param videos The videos that should be checked for having more views.
   * @return The videos that have received more views.
   */
  async updateVideoViewCounts(videos: Array<Video>): Array<Video> {
    let videosMap = new Map()
    for (let video of videos) {
      videosMap.set(video.id, video)
    }

    let videoIds = Array.from(videosMap.keys())
    let videosMetaData = await PRIVATE(this).apiKey.getVideosMetaData(videoIds)

    let updated = []
    for (let videoMetaData of videosMetaData) {
      let video = videosMap.get(videoMetaData.id)
      if (video.viewCount !== videoMetaData.viewCount) {
        video.videoCount = videoMetaData.viewCount
        video.lastUpdate = new Date()
        updated.push(video)
      }
    }

    return updated
  }

  /**
   * Adds the specified video to the specified playlist. The video will be
   * added at the beginning of the playlist.
   *
   * This method requires the current user to have a valid OAuth2 authorization
   * token available.
   *
   * @param video The video to add to the playlist.
   * @param playlist The playlist to which the video should be added.
   */
  async addVideoToPlaylist(video: Video, playlist: Playlist): void {
    let apiClient = PRIVATE(this).apiClient
    return await apiClient.addPlaylistItem(playlist.id, video.id)
  }

  /**
   * Constructs the entities representing an incognito subscription from the
   * provided information.
   *
   * @param subscriptionType The type of the incognito subscription - one of
   *        the.
   * @param playlistInfo Information fetched about the playlist related to the
   *        subscription.
   * @param channelInfo Information fetched about the channel related to the
   *        subscription.
   * @return An array of entities representing the details of an incognito
   *         subscription.
   */
  [PRIVATE.toIncognitoSubscriptionInfo](subscriptionType: string,
      playlistInfo: Object, channelInfo: Object):
      [Subscription, Playlist, Channel] {
    return [
      new Subscription({
        type: subscriptionType,
        playlistId: playlistInfo.id,
        channelId: channelInfo.id,
        state: SubscriptionState.ACTIVE,
        lastError: null,
        accountId: null,
        isIncognito: 1
      }),
      new Playlist({
        id: playlistInfo.id,
        title: playlistInfo.title,
        description: playlistInfo.description,
        videoCount: playlistInfo.videoCount,
        thumbnails: playlistInfo.thumbnails,
        accountIds: [],
        incognitoSubscriptionIds: []
      }),
      new Channel({
        id: channelInfo.id,
        title: channelInfo.title,
        thumbnails: channelInfo.thumbnails,
        uploadsPlaylistId: channelInfo.uploadsPlaylistId,
        accountIds: [],
        incognitoSubscriptionIds: []
      })
    ]
  }
}
