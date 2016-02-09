
import createPrivate from "../../createPrivate";
import Lock from "../../Lock"
import SubscriptionType from "../../model/SubscriptionType"

/**
 * Storage keys used to identify the data stored in the Chrome's synchronized
 * storage. The keys are as short as possible to save data.
 *
 * @type {Object<string, string>}
 */
const STORAGE_KEYS = Object.freeze({
  ACCOUNTS: "a",
  SUBSCRIBED_CHANNELS: "c",
  SUBSCRIBED_PLAYLISTS: "p"
})

/**
 * The maximum number of bytes that all storage items may occupy in the storage
 * together.
 *
 * @type {number}
 */
const QUOTA_BYTES = chrome.storage.sync.QUOTA_BYTES // 102,400

/**
 * The maximum number of bytes that a storage item may occupy.
 *
 * @type {number}
 */
const QUOTA_BYTES_PER_ITEM = chrome.storage.sync.QUOTA_BYTES_PER_ITEM // 8,192

const PRIVATE = createPrivate()
// private methods
PRIVATE.getItem = Symbol("getItem")
PRIVATE.setItem = Symbol("setItem")
PRIVATE.getItemQuotaUsage = Symbol("getItemQuotaUsage")
PRIVATE.switchAccountsState = Symbol("switchAccountsState")
PRIVATE.switchSubscriptionsState = Symbol("switchSubscriptionsState")

/**
 * Utility for easier management of Google account IDs and incognito
 * subscriptions in the synchronized Chrome storage.
 */
export default class SyncStorage {
  /**
   * Initializes the Synchronized Storage accessor.
   */
  constructor() {
    /**
     * Lock used to synchronize the access to the Google accounts storage.
     *
     * @type {Lock}
     */
    PRIVATE(this).accountsLock = new Lock()

    /**
     * Lock used to synchronize the access to the storage of incognito
     * subscriptions.
     *
     * @type {Lock}
     */
    PRIVATE(this).subscriptionsLock = new Lock()

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return
      }

      // TODO: process changes by notifying the listeners
    })
  }

  /**
   * Returns the IDs of the managed Google accounts.
   *
   * @return The IDs of the managed Google accounts.
   */
  async getAccountIds(): Array<{account: string, enabled: boolean}> {
    let accountsData = await this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
    if (!accountsData) {
      accountsData = []
    }

    let accounts = []
    for (let i = 0; i < accountsData.length; i += 2) {
      accounts.push({
        account: accountsData[i],
        enabled: !!accountsData[i + 1]
      })
    }
    return accounts
  }

  /**
   * Adds the specified Google account to the managed Google accounts.
   *
   * @param accountId The Google account ID of the account to add.
   */
  async addAccount(accountId: string): void {
    await PRIVATE(this).accountsLock.lock(async () => {
      let accounts = await this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
      if (!accounts) {
        accounts = []
      }

      if (!accounts.includes(accountId)) {
        accounts.push(accountId, 1)
        await this[PRIVATE.setItem](STORAGE_KEYS.ACCOUNTS, accounts)
      }
    })
  }

  /**
   * Enables the specified Google accounts.
   *
   * @param accountIds The accounts to enable.
   */
  async enableAccounts(accountIds: Array<string>): void {
    await this[PRIVATE.switchAccountsState](true, accountIds)
  }

  /**
   * Disables the specified Google accounts.
   *
   * @param accountsIds The accounts to disable.
   */
  async disableAccounts(accountsIds: Array<string>): void {
    await this[PRIVATE.switchAccountsState](false, accountsIds)
  }

  /**
   * Deletes the specified accounts from the list of managed Google accounts.
   *
   * @param accountIds Google account IDs of accounts to delete.
   */
  async removeAccounts(accountIds: string): void {
    await PRIVATE(this).accountsLock.lock(async () => {
      let accounts = await this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
      if (!accounts) {
        accounts = []
      }

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

  /**
   * Returns the list of incognito subscriptions. The channels will always
   * precede the playlists.
   *
   * @return The list of incognito subscriptions.
   */
  async getIncognitoSubscriptions(): Array<
    {channel: string, enabled: boolean}|{playlist: string, enabled: boolean}
  > {
    let [channelsData, playlistsData] = await Promise.all([
      this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_CHANNELS),
      this[PRIVATE.getItem](STORAGE_KEYS.SUBSCRIBED_PLAYLISTS)
    ])
    if (!channelsData) {
      channelsData = []
    }
    if (!playlistsData) {
      playlistsData = []
    }

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

  /**
   * Adds the provided incognito subscription to incognito subscriptions.
   *
   * @param type The subscription type.
   * @param resourceId The channel or playlist ID.
   */
  async addIncognitoSubscription(type: SubscriptionType, resourceId: string):
      void {
    await PRIVATE(this).subscriptionsLock(async () => {
      switch (type) {
        case SubscriptionType.CHANNEL:
          let channels = await this[PRIVATE.getItem](
            STORAGE_KEYS.SUBSCRIBED_CHANNELS
          )
          if (!channels) {
            channels = []
          }
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
          if (!playlists) {
            playlists = []
          }
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

  /**
   * Enables the specified incognito subscriptions.
   *
   * @param subscriptions The subscription to enable.
   */
  async enableIncognitoSubscriptions(
      subscriptions: Array<{type: SubscriptionType, resourceId: string}>):
      void {
    await this[PRIVATE.switchSubscriptionsState](true, subscriptions)
  }

  /**
   * Disables the specified incognito subscriptions.
   *
   * @param subscriptions The subscriptions to disable.
   */
  async disableIncognitoSubscriptions(
      subscriptions: Array<{type: SubscriptionType, resourceId: string}>):
      void {
    await this[PRIVATE.switchSubscriptionsState](false, subscriptions)
  }

  /**
   * Deletes the specified subscriptions from the list of incognito
   * subscriptions.
   *
   * @param subscriptions The subscriptions to delete.
   */
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
      if (!channelsData) {
        channelsData = []
      }
      if (!playlistsData) {
        playlistsData = []
      }

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

  /**
   * Retrieves the information about the current quota usage.
   *
   * The {@code accounts}, {@code channels} and {@code playlists} fields of the
   * returned object specify the number of bytes occupied by these in the
   * storage. The {@code itemMaximum} field specifies the maximum number of
   * bytes a single storage item (accounts list, incognito subscribed channels
   * list or incognito subscribed playlists list) may occupy. Finally, the
   * {@code totalMaximum} specifies the maximum number of bytes all of the
   * storage items may occupy together.
   *
   * @return Information about the current quota usage.
   */
  async getQuotaUsage(): {
    accounts: number,
    channels: number,
    playlists: number,
    itemMaximum: number,
    totalMaximum: number
  } {
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

  /**
   * Sets or resets the {@code enabled} flag on the specified accounts.
   *
   * @param enable A flag signalling whether the accounts should be enabled or
   *        disabled.
   * @param accountIds The accounts to modify.
   */
  async [PRIVATE.switchAccountsState](enable: boolean,
      accountIds: Array<string>): void {
    await PRIVATE(this).accountsLock.lock(async () => {
      let accounts = this[PRIVATE.getItem](STORAGE_KEYS.ACCOUNTS)
      if (!accounts) {
        accounts = []
      }

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

  /**
   * Sets or resets the {@code enabled} flag of the specified subscriptions.
   *
   * @param enable A flag signalling whether the subscriptions should be
   *        enabled or disabled.
   * @param subscriptions The subscriptions to modify.
   */
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
      if (!channelsData) {
        channelsData = []
      }
      if (!playlistsData) {
        playlistsData = []
      }

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

  /**
   *
   * @param key
   * @return A promise that will resolve to the storage item's value, or
   *         {@code null} if the item does not exist.
   */
  [PRIVATE.getItem](key: string):
      Promise<?(number|string|Array<number|string>)> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(key, (items) => {
        if (chrome.runtime.lastError) {
          let error = new Error(chrome.runtime.lastError.message)
          error.name = "StorageError"
          reject(error)
          return
        }

        resolve(items.hasOwnProperty(key) ? items[key] : null)
      })
    })
  }

  /**
   * Stores the provided value in the storage in an item identified by the
   * specified key. If the item already exists, it will be overwritten.
   *
   * @param key The storage item key that uniquely identifies it.
   * @param value The value to store in the storage.
   * @return A promise that will resolve when the value has been saved to the
   *         storage.
   */
  [PRIVATE.setItem](key: string, value: number|string|Array<number|string>):
      Promise<void> {
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

  /**
   * Retrieves the number of bytes occupied in the storage by the specified
   * item.
   *
   * @param key The key identifying the storage item.
   * @return A promise that will resolve to the number of bytes used by the
   *         specified storage item.
   */
  [PRIVATE.getItemQuotaUsage](key: string): Promise<number> {
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
