
import createPrivate from "../../createPrivate";
import Lock from "../../Lock"
import SubscriptionType from "../../model/SubscriptionType"

const STORAGE_KEYS = Object.freeze({
  ACCOUNTS: "a",
  SUBSCRIBED_CHANNELS: "c",
  SUBSCRIBED_PLAYLISTS: "p"
})

const QUOTA_BYTES = chrome.storage.sync.QUOTA_BYTES // 102,400

const QUOTA_BYTES_PER_ITEM = chrome.storage.sync.QUOTA_BYTES_PER_ITEM // 8,192

const PRIVATE = createPrivate()
// private methods
PRIVATE.getItem = Symbol("getItem")
PRIVATE.setItem = Symbol("setItem")
PRIVATE.getItemQuotaUsage = Symbol("getItemQuotaUsage")
PRIVATE.switchAccountsState = Symbol("switchAccountsState")
PRIVATE.switchSubscriptionsState = Symbol("switchSubscriptionsState")

export default class SyncStorage {
  constructor() {
    PRIVATE(this).accountsLock = new Lock()

    PRIVATE(this).subscriptionsLock = new Lock()

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return
      }

      // TODO: process changes by notifying the listeners
    })
  }

  async getAccountIds(): Array<{id: string, enabled: boolean}> {
    let accountsData = await this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
    let accounts = []
    for (let i = 0; i < accountsData.length; i += 2) {
      accounts.push({
        id: accountsData[i],
        enabled: !!accountsData[i + 1]
      })
    }
    return accounts
  }

  async addAccount(accountId: string): void {
    await PRIVATE(this).accountsLock.lock(async () => {
      let accounts = await this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
      if (!accounts.includes(accountId)) {
        accounts.push(accountId, 1)
        await this[PRIVATE.setItem](STORAGE_KEYS.ACCOUNTS, accounts)
      }
    })
  }

  async enableAccounts(accountIds: Array<string>): void {
    await this[PRIVATE.switchAccountsState](true, accountIds)
  }

  async disableAccounts(accountsIds: Array<string>): void {
    await this[PRIVATE.switchAccountsState](false, accountsIds)
  }

  async removeAccounts(accountIds: string): void {
    await PRIVATE(this).accountsLock.lock(async () => {
      let accounts = await this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
      let changed = false
      for (let i = accounts.length - 2; i >= 0; i -= 2) {
        if (accountIds.includes(accounts[i])) {
          accounts.splice(i, 2)
          changed = true
        }
      }

      if (changed) {
        await this[PRIVATE.setItem](STORAGE_KEYS.ACCOUNTS, accounts)
      }
    })
  }

  async getIncognitoSubscriptions():
      Array<{channel: string, enabled: boolean}|{playlist: string, enabled: boolean}> {
    let [channelsData, playlistsData] = await Promise.all([
      this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_CHANNELS),
      this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_PLAYLISTS)
    ])

    let channels = []
    for (let i = 0; i < channelsData.length; i += 2) {
      channels.push({
        channel: channelsData[i],
        enabled: !!channelsData[i + 1]
      })
    }

    let playlists = []
    for (let i = 0; i < playlistsData.length; i += 2) {
      playlists.push({
        playlist: playlistsData[i],
        enabled: !!playlistsData[i + 1]
      })
    }

    return channels.concat(playlists)
  }

  async addIncognitoSubscription(type: SubscriptionType, resourceId: string):
      void {
    await PRIVATE(this).subscriptionsLock(async () => {
      switch (type) {
        case SubscriptionType.CHANNEL:
          let channels = await this[PRIVATE.getItem](
            STORAGE_KEYS.SUBSCRIBED_CHANNELS
          )
          if (!channels.includes(resourceId)) {
            channels.push(resourceId, 1)
            await this[PRIVATE.setItem](
              STORAGE_KEYS.SUBSCRIBED_CHANNELS,
              channels
            )
          }
          break
        case SubscriptionType.PLAYLIST:
          let playlists = await this[PRIVATE.getItem](
            STORAGE_KEYS.SUBSCRIBED_PLAYLISTS
          )
          if (!playlists.includes(resourceId)) {
            playlists.push(resourceId, 1)
            await this[PRIVATE.setItem](
              STORAGE_KEYS.SUBSCRIBED_CHANNELS,
              playlists
            )
          }
          break
        default:
          throw new Error(`Unknown subscription type: ${type}`)
      }
    })
  }

  async enableIncognitoSubscriptions(
      subscriptions: Array<{type: SubscriptionType, resourceId: string}>):
      void {
    await this[PRIVATE.switchSubscriptionsState](true, subscriptions)
  }

  async disableIncognitoSubscriptions(
      subscriptions: Array<{type: SubscriptionType, resourceId: string}>):
      void {
    await this[PRIVATE.switchSubscriptionsState](false, subscriptions)
  }

  async removeIncognitoSubscriptions(
      subscriptions: Array<{type: SubscriptionType, resourceId: string}>):
      void {
    let channelsToRemove = new Set()
    let playlistsToRemove = new Set()
    for (let subscription of subscriptions) {
      if (subscription.type === SubscriptionType.CHANNEL) {
        channelsToRemove.add(subscription.resourceId)
      } else {
        playlistsToRemove.add(subscription.resourceId)
      }
    }

    await PRIVATE(this).subscriptionsLock.lock(async () => {
      let [channelsData, playlistsData] = await Promise.all([
        this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_CHANNELS),
        this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_PLAYLISTS)
      ])

      let changed = false
      for (let i = channelsData.length - 2; i >= 0; i -= 2) {
        if (channelsToRemove.has(channelsData[i])) {
          channelsData.splice(i, 2)
          changed = true
        }
      }
      for (let i = playlistsData.length - 2; i >= 0; i -= 2) {
        if (playlistsToRemove.has(playlistsData[i])) {
          channelsData.splice(i, 2)
          changed = true
        }
      }

      if (!changed) {
        return
      }

      await Promise.all([
        this[PRIVATE.setItem](STORAGE_KEYS.SUBSCRIBED_CHANNELS, channelsData),
        this[PRIVATE.setItem](STORAGE_KEYS.SUBSCRIBED_PLAYLISTS, playlistsData)
      ])
    })
  }

  async getQuotaUsage(): {accounts: number, channels: number, playlists: number, itemMaximum: number, totalMaximum: number} {
    let [accounts, channels, playlists] = await Promise.all([
      this[PRIVATE.getItemQuotaUsage](STORAGE_KEYS.ACCOUNTS),
      this[PRIVATE.getItemQuotaUsage](STORAGE_KEYS.SUBSCRIBED_CHANNELS),
      this[PRIVATE.getItemQuotaUsage](STORAGE_KEYS.SUBSCRIBED_PLAYLISTS)
    ])

    return {
      accounts,
      channels,
      playlists,
      itemMaximum: QUOTA_BYTES_PER_ITEM,
      totalMaximum: QUOTA_BYTES
    }
  }

  async [PRIVATE.switchAccountsState](enable: boolean,
      accountIds: Array<string>): void {
    await PRIVATE(this).accountsLock.lock(async () => {
      let accounts = this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
      let changed = false
      for (let i = 0; i < accounts.length; i += 2) {
        if (accountIds.includes(accounts[i])) {
          accounts[i + 1] = enable ? 1 : 0
          changed = true
        }
      }

      if (changed) {
        this[PRIVATE.setItem](STORAGE_KEYS.ACCOUNTS, accounts)
      }
    })
  }

  async [PRIVATE.switchSubscriptionsState](enable: boolean,
      subscriptions: Array<{type: SubscriptionType, resourceId: string}>):
      void {
    let channelsToModify = new Set()
    let playlistsToModify = new Set()
    for (let subscription of subscriptions) {
      if (subscription.type === SubscriptionType.CHANNEL) {
        channelsToModify.add(subscription.resourceId)
      } else if (subscription.type === SubscriptionType.PLAYLIST) {
        playlistsToModify.add(subscription.resourceId)
      }
    }

    await PRIVATE(this).subscriptionsLock.lock(async () => {
      let [channelsData, playlistsData] = await Promise.all([
        this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_CHANNELS),
        this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_PLAYLISTS)
      ])

      let changed = false
      for (let i = 0; i < channelsData.length; i += 2) {
        if (channelsToModify.has(channelsData[i])) {
          channelsData[i + 1] = enable ? 1 : 0
          changed = true
        }
      }
      for (let i = 0; i < playlistsData.length; i += 2) {
        if (playlistsToModify.has(playlistsData[i])) {
          playlistsData[i + 1] = enable ? 1 : 0
          changed = true
        }
      }

      if (!changed) {
        return
      }

      await Promise.all([
        this[PRIVATE.setItem](STORAGE_KEYS.SUBSCRIBED_CHANNELS, channelsData),
        this[PRIVATE.setItem](STORAGE_KEYS.SUBSCRIBED_PLAYLISTS, playlistsData)
      ])
    })
  }

  [PRIVATE.getItem](key: string): ?(number|string|Array<number|string>) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(key, (items) => {
        if (chrome.runtime.lastError) {
          let error = new Error(chrome.runtime.lastError.message)
          error.name = "StorageError"
          reject(error)
          return
        }

        resolve(items[key])
      })
    })
  }

  [PRIVATE.setItem](key: string, value: number|string|Array<number|string>):
      void {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          let error = new Error(chrome.runtime.lastError.message)
          error.name = "StorageError"
          reject(error)
          return
        }

        resolve()
      })
    })
  }

  [PRIVATE.getItemQuotaUsage](key: string): number {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.getBytesInUse(key, (bytesInUse) => {
        if (chrome.runtime.lastError) {
          let error = new Error(chrome.runtime.lastError.message)
          error.name = "StorageError"
          reject(error)
          return
        }

        resolve(bytesInUse)
      })
    })
  }
}
