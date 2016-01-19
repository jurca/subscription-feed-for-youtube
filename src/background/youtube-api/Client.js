
import YouTubeApiClient from "sf4yt-gapi-client/es2015/YouTubeApiClient"
import Account from "../../model/Account"
import AccountState from "../../model/AccountState"
import Channel from "../../model/Channel"
import Playlist from "../../model/Playlist"
import Subscription from "../../model/Subscription"
import SubscriptionState from "../../model/SubscriptionState"
import SubscriptionType from "../../model/SubscriptionType"
import Video from "../../model/Video"

const PRIVATE = Object.freeze({
  apiClient: Symbol("apiClient")
})

export default class Client {
  constructor(apiClient: YouTubeApiClient) {
    this[PRIVATE.apiClient] = apiClient
  }

  async getAccountInfo(accountId: string, channelId: ?string = null): Account {
    let accountData = await this[PRIVATE.apiClient].getAccountInfo(channelId)
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

  async getSubscriptions(account: Account, authorized: boolean = false):
      Array<[Subscription, Channel]> {
    let apiClient = this[PRIVATE.apiClient]
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

  async getUploadsPlaylists(channels: Array<Channel>): Array<Playlist> {
    let playlistToChannel = new Map()
    for (let channel of channels) {
      playlistToChannel.set(channel.uploadsPlaylistId, channel)
    }

    let playlistIds = channels.map(channel => channel.uploadsPlaylistId)
    let playlists = await this[PRIVATE.apiClient].getPlaylists(playlistIds)

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

  // TODO: return the channel and playlist
  async resolveIncognitoSubscription(url: string): Subscription {
    let validator = /^https:\/\/www\.youtube\.com\/(channel\/|user\/|playlist\?(.+&)?list=|watch\?(.+&)?list=).+$/
    if (!validator.test(url)) {
      throw new Error("Invalid user, channel or playlist URL")
    }

    let apiClient = this[PRIVATE.apiClient]
    let channelId = null
    let subscriptionType = SubscriptionType.PLAYLIST
    let userMatcher = /^https:\/\/www\.youtube\.com\/user\/([^/]+)$/
    let channelMatcher = /^https:\/\/www\.youtube\.com\/channel\/([^/]+)$/
    if (userMatcher.test(url)) {
      let username = decodeURIComponent(userMatcher.exec(url)[1])
      channelId = await apiClient.getUserChannelId(username)
    } else if (channelMatcher.test(url)) {
      channelId = decodeURIComponent(channelMatcher.exec(url)[1])
    }

    let playlistMatcher = /^https:\/\/www\.youtube\.com\/(?:playlist|watch)\?(?:.+&)?list=([^&]+)(?:&.+)?$/
    let playlistId
    if (channelId) {
      subscriptionType = SubscriptionType.CHANNEL
      playlistId = await apiClient.getUploadsPlaylistId(channelId)
    } else {
      playlistId = decodeURIComponent(playlistMatcher.exec(url)[1])
      let playlistInfo = await apiClient.getPlaylistInfo(playlistId)
      channelId = playlistInfo.channelId
    }

    return new Subscription({
      type: subscriptionType,
      playlistId,
      channelId,
      state: SubscriptionState.ACTIVE,
      lastError: null,
      accountId: null,
      isIncognito: 1
    })
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
    let apiClient = this[PRIVATE.apiClient]
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

    let apiClient = this[PRIVATE.apiClient]
    let videos = await apiClient.getPlaylistVideos(playlist.id, (videos) => {
      for (let video of videos) {
        let videoId = video.resourceId.videoId
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
        watched: 0
      })))
    }

    let newVideoIds = Array.from(videoEntities.keys())
    let metadata = await apiClient.getVideosMetaData(newVideoIds)
    for (let data of metadata) {
      let entity = videoEntities.get(data.id)
      entity.duration = data.duration
      entity.viewCount = data.viewCount
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
    let videosMetaData = await this[PRIVATE.apiKey].getVideosMetaData(videoIds)

    let updated = []
    for (let videoMetaData of videosMetaData) {
      let video = videosMap.get(videoMetaData.id)
      if (video.viewCount !== videoMetaData.viewCount) {
        video.videoCount = videoMetaData.viewCount
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
    let apiClient = this[PRIVATE.apiClient]
    return await apiClient.addPlaylistItem(playlist.id, video.id)
  }
}
