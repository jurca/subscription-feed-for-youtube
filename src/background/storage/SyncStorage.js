
import createPrivate from "../../createPrivate";
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
PRIVATE.lock = Symbol("lock")

export default class SyncStorage {
  constructor() {
    PRIVATE(this).accountsLock = false

    PRIVATE(this).channelsLock = false

    PRIVATE(this).playlistsLock = false

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return
      }

      // TODO: process changes by notifying the listeners
    })
  }

  async getAccountIds(): Array<string> {
    return await this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
  }

  async addAccount(accountId: string): void {
    await this[PRIVATE.lock](
      () => PRIVATE(this).accountsLock,
      () => PRIVATE(this).accountsLock = true
    )

    let accountIds = await this.getAccountIds()
    if (!accountIds.includes(accountId)) {
      accountIds.push(accountId)
      await this[PRIVATE.setItem](STORAGE_KEYS.ACCOUNTS, accountIds)
    }

    PRIVATE(this).accountsLock = false
  }

  async removeAccount(accountId: string): void {
    await this[PRIVATE.lock](
      () => PRIVATE(this).accountsLock,
      () => PRIVATE(this).accountsLock = true
    )

    let accountsIds = await this.getAccountIds()
    let idIndex = accountsIds.indexOf(accountId)
    if (idIndex > -1) {
      accountsIds.splice(idIndex, 1)
      await this[PRIVATE.setItem](STORAGE_KEYS.ACCOUNTS)
    }

    PRIVATE(this).accountsLock = false
  }

  async getIncognitoSubscriptions(): Array<{channel: string, enabled: boolean}|{playlist: string, enabled: boolean}> {
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
    switch (type) {
      case SubscriptionType.CHANNEL:
        await this[PRIVATE.lock](
          () => PRIVATE(this).channelsLock,
          () => PRIVATE(this).channelsLock = true
        )

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

        PRIVATE(this).channelsLock = false
        break
      case SubscriptionType.PLAYLIST:
        await this[PRIVATE.lock](
          () => PRIVATE(this).playlistsLock,
          () => PRIVATE(this).playlistsLock = true
        )

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

        PRIVATE(this).playlistsLock = false
        break
      default:
        throw new Error(`Unknown subscription type: ${type}`)
    }
  }

  async enableIncognitoSubscription(type: SubscriptionType, resourceId: string): void {
    //
  }

  async disableIncognitoSubscription(type: SubscriptionType, resourceId: string): void {
    //
  }

  async removeIncognitoSubscription(type: SubscriptionType, resourceId: string) {
    switch (type) {
      case SubscriptionType.CHANNEL:
        await this[PRIVATE.lock](
          () => PRIVATE(this).channelsLock,
          () => PRIVATE(this).channelsLock = true
        )

        let channels = await this[PRIVATE.getItem](
          STORAGE_KEYS.SUBSCRIBED_CHANNELS
        )
        let idIndex = channels.indexOf(resourceId)
        if (idIndex > -1) {
          channels.splice(idIndex, 1)
          await this[PRIVATE.setItem](
            STORAGE_KEYS.SUBSCRIBED_CHANNELS,
            channels
          )
        }

        PRIVATE(this).playlistsLock = false
        break
      case SubscriptionType.PLAYLIST:
        await this[PRIVATE.lock](
          () => PRIVATE(this).playlistsLock,
          () => PRIVATE(this).playlistsLock = true
        )

        let playlists = await this[PRIVATE.getItem](
          STORAGE_KEYS.SUBSCRIBED_PLAYLISTS
        )
        let idIndex = playlists.indexOf(resourceId)
        if (idIndex > -1) {
          playlists.splice(idIndex, 1)
          await this[PRIVATE.setItem](
            STORAGE_KEYS.SUBSCRIBED_PLAYLISTS,
            playlists
          )
        }

        PRIVATE(this).playlistsLock = false
        break
      default:
        throw new Error(`Unknown subscription type: ${type}`)
    }
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

  [PRIVATE.lock](lockStateGetter, lockGainer) {
    return new Promise((resolve) => {
      test()

      function test() {
        if (!lockStateGetter()) {
          lockGainer()
          resolve()
          return
        }

        setTimeout(test, Math.floor(Math.random() * 50))
      }
    })
  }
}
