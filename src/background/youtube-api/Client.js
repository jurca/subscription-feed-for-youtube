
import YouTubeApiClient from "sf4yt-gapi-client/es2015/YouTubeApiClient"
import Account from "../../model/Account"
import AccountState from "../../model/AccountState"
import Playlist from "../../model/Playlist"
import Subscription from "../../model/Subscription"
import SubscriptionState from "../../model/SubscriptionState"
import SubscriptionType from "../../model/SubscriptionType"

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
      Array<Subscription> {
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
      return new Subscription({
        type: SubscriptionType.CHANNEL,
        playlistId: channel.uploadsPlaylistId,
        channelId: channel.id,
        state: SubscriptionState.ACTIVE,
        lastError: null,
        accountId: account.id,
        isIncognito: 0
      })
    })
  }

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

  async getPlaylistsWithNewContent(playlists: Array<Playlist>):
      Array<Playlist> {
    let playlistsMap = new Map()
    for (let playlist of playlists) {
      playlistsMap.set(playlist.id, playlist)
    }

    let playlistIds = Array.from(playlistsMap.keys())
    let apiClient = this[PRIVATE.apiClient]
    let videoCounts = await apiClient.getPlaylistVideoCounts(playlistIds)

    let updated = []
    for (let videoCount of videoCounts) {
      let playlist = playlistsMap.get(videoCount.id)
      if (playlist.videoCount !== videoCount.videoCount) {
        playlist.videoCount = videoCount.videoCount
        updated.push(playlist)
      }
    }

    return updated
  }
}