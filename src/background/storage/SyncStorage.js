
import createPrivate from "../../createPrivate"
import EventBus from "../../EventBus"
import Lock from "../../Lock"
import SubscriptionType from "../../model/SubscriptionType"

/**
 * Storage keys used to identify the data stored in the Chrome's synchronized
 * storage. The keys are as short as possible to save data.
 *
 * @type {{ACCOUNTS: string, SUBSCRIBED_CHANNELS: string, SUBSCRIBED_PLAYLISTS: string}}
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

/**
 * Possible accounts, playlists or channels list modification types.
 *
 * @type {{ADDED: string, REMOVED: string, ENABLED: string, DISABLED: string}}
 */
const MODIFICATION_TYPES = Object.freeze({
  ADDED: "ADDED",
  REMOVED: "REMOVED",
  ENABLED: "ENABLED",
  DISABLED: "DISABLED"
})

const PRIVATE = createPrivate()

/**
 * Utility for easier management of Google account IDs and incognito
 * subscriptions in the synchronized Chrome storage.
 */
export default class SyncStorage {
  /**
   * Initializes the Synchronized Storage accessor.
   *
   * @param eventBus The event bus for sending event about updates of changes
   *        in the storage.
   */
  constructor(eventBus: EventBus) {
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

    /**
     * The event bus for sending event about updates of changes in the storage.
     *
     * @type {EventBus}
     */
    PRIVATE(this).eventBus = eventBus

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return
      }

      for (let field of Object.keys(changes)) {
        let change = changes[field]
        switch (field) {
          case STORAGE_KEYS.ACCOUNTS:
            this[PRIVATE.onAccountsModified](change.oldValue, change.newValue)
            break
          case STORAGE_KEYS.SUBSCRIBED_CHANNELS:
            this[PRIVATE.onChannelsModified](change.oldValue, change.newValue)
            break
          case STORAGE_KEYS.SUBSCRIBED_PLAYLISTS:
            this[PRIVATE.onPlaylistsModified](change.oldValue, change.newValue)
            break
          default:
            // some other storage item was modified, nothing to do
            break
        }
      }
    })

    Object.freeze(this)
  }

  /**
   * Returns the constants containing the names of the event bus events fired
   * by this synchronized storage.
   *
   * @return The constants containing the names of the event bus events fired
   *         by this synchronized storage.
   */
  static get EVENTS(): {
    ACCOUNT_ADDED: string,
    ACCOUNT_ENABLED: string,
    ACCOUNT_DISABLED: string,
    ACCOUNT_REMOVED: string,
    CHANNEL_ADDED: string,
    CHANNEL_ENABLED: string,
    CHANNEL_DISABLED: string,
    CHANNEL_REMOVED: string,
    PLAYLIST_ADDED: string,
    PLAYLIST_ENABLED: string,
    PLAYLIST_DISABLED: string,
    PLAYLIST_REMOVED: string
  } {
    const eventPrefix = "background.storage.SyncStorage.EVENTS."
    return Object.freeze({
      ACCOUNT_ADDED: `${eventPrefix}ACCOUNT_ADDED`,
      ACCOUNT_ENABLED: `${eventPrefix}ACCOUNTS_ENABLED`,
      ACCOUNT_DISABLED: `${eventPrefix}ACCOUNTS_DISABLED`,
      ACCOUNT_REMOVED: `${eventPrefix}ACCOUNTS_REMOVED`,

      CHANNEL_ADDED: `${eventPrefix}CHANNEL_ADDED`,
      CHANNEL_ENABLED: `${eventPrefix}CHANNEL_ENABLED`,
      CHANNEL_DISABLED: `${eventPrefix}CHANNEL_DISABLED`,
      CHANNEL_REMOVED: `${eventPrefix}CHANNEL_REMOVED`,

      PLAYLIST_ADDED: `${eventPrefix}PLAYLIST_ADDED`,
      PLAYLIST_ENABLED: `${eventPrefix}PLAYLIST_ENABLED`,
      PLAYLIST_DISABLED: `${eventPrefix}PLAYLIST_DISABLED`,
      PLAYLIST_REMOVED: `${eventPrefix}PLAYLIST_REMOVED`
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
  async addIncognitoSubscription(
    type: SubscriptionType,
    resourceId: string
  ): void {
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
    subscriptions: Array<{type: SubscriptionType, resourceId: string}>
  ): void {
    await this[PRIVATE.switchSubscriptionsState](true, subscriptions)
  }

  /**
   * Disables the specified incognito subscriptions.
   *
   * @param subscriptions The subscriptions to disable.
   */
  async disableIncognitoSubscriptions(
    subscriptions: Array<{type: SubscriptionType, resourceId: string}>
  ): void {
    await this[PRIVATE.switchSubscriptionsState](false, subscriptions)
  }

  /**
   * Deletes the specified subscriptions from the list of incognito
   * subscriptions.
   *
   * @param subscriptions The subscriptions to delete.
   */
  async removeIncognitoSubscriptions(
    subscriptions: Array<{type: SubscriptionType, resourceId: string}>
  ): void {
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
  async [PRIVATE.switchAccountsState](
    enable: boolean,
    accountIds: Array<string>
  ): void {
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
  async [PRIVATE.switchSubscriptionsState](
    enable: boolean,
    subscriptions: Array<{type: SubscriptionType, resourceId: string}>
  ): void {
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

  /**
   * Handles modifications of the user's Google account list. The method will
   * detect the modifications made and notifies the rest of the application
   * using events send via the event bus.
   *
   * @param oldAccounts The old account IDs, with each playlist ID followed by
   *        a flag whether the subscription is active.
   * @param newAccounts The new account IDs, with each playlist ID followed by
   *        a flag whether the subscription is active.
   */
  [PRIVATE.onAccountsModified](oldAccounts, newAccounts) {
    this[PRIVATE.processModifications](oldAccounts, newAccounts, {
      ADDED: SyncStorage.EVENTS.ACCOUNT_ADDED,
      ENABLED: SyncStorage.EVENTS.ACCOUNT_ENABLED,
      DISABLED: SyncStorage.EVENTS.ACCOUNT_DISABLED,
      REMOVED: SyncStorage.EVENTS.ACCOUNT_REMOVED
    })
  }

  /**
   * Handles modifications of the channel incognito subscriptions list. The
   * method will detect the modifications made and notifies the rest of the
   * application using events send via the event bus.
   *
   * @param oldChannels The old channel IDs, with each playlist ID followed by
   *        a flag whether the subscription is active.
   * @param newChannels The new channel IDs, with each playlist ID followed by
   *        a flag whether the subscription is active.
   */
  [PRIVATE.onChannelsModified](oldChannels, newChannels) {
    this[PRIVATE.processModifications](oldChannels, newChannels, {
      ADDED: SyncStorage.EVENTS.CHANNEL_ADDED,
      ENABLED: SyncStorage.EVENTS.CHANNEL_ENABLED,
      DISABLED: SyncStorage.EVENTS.CHANNEL_DISABLED,
      REMOVED: SyncStorage.EVENTS.CHANNEL_REMOVED
    })
  }

  /**
   * Handles modifications of the playlist incognito subscriptions list. The
   * method will detect the modifications made and notifies the rest of the
   * application using events send via the event bus.
   *
   * @param oldPlaylists The old playlist IDs, with each playlist ID followed
   *        by a flag whether the subscription is active.
   * @param newPlaylists The new playlist IDs, with each playlist ID followed
   *        by a flag whether the subscription is active.
   */
  [PRIVATE.onPlaylistsModified](oldPlaylists, newPlaylists) {
    this[PRIVATE.processModifications](oldPlaylists, newPlaylists, {
      ADDED: SyncStorage.EVENTS.PLAYLIST_ADDED,
      ENABLED: SyncStorage.EVENTS.PLAYLIST_ENABLED,
      DISABLED: SyncStorage.EVENTS.PLAYLIST_DISABLED,
      REMOVED: SyncStorage.EVENTS.PLAYLIST_REMOVED
    })
  }

  /**
   * Detects the modifications that lead from the old resource ID list to the
   * new resource ID list, and then notifies the rest of the application by
   * sending events using the event bus.
   *
   * The resource ID list is a list of account/channel/playlist IDs with each
   * ID followed by a {@code 1} or {@code 0} depending on the resource being
   * marked as enabled or disabled respectively.
   *
   * @param oldResources The old list of resource IDs and enabled flags.
   * @param newResources The new list of resource IDs and enabled flags.
   * @param events The names of teh events to fire for each modification type.
   */
  [PRIVATE.processModifications](
    oldResources: ?Array<(number|string)>,
    newResources: ?Array<(number|string)>,
    events: {ADDED: string, ENABLED: string, DISABLED: string, REMOVED: string}
  ): void {
    let modifications = this[PRIVATE.getListModifications](
      oldResources,
      newResources
    )
    this[PRIVATE.sendModificationNotifications](modifications, events)
  }

  /**
   * Sends events of the specified names to notify the rest of the application
   * about the provided modifications of the contents of the synchronized
   * storage.
   *
   * @param modifications The modifications of which to notify the rest of the
   *        application.
   * @param events The names of the events to fire for each modification type.
   */
  [PRIVATE.sendModificationNotifications](
    modifications: Array<{type: string, id: string}>,
    events: {ADDED: string, ENABLED: string, DISABLED: string, REMOVED: string}
  ): void {
    for (let modification of modifications) {
      let eventName

      switch (modification.type) {
        case MODIFICATION_TYPES.ADDED:
          eventName = events.ADDED
          break
        case MODIFICATION_TYPES.ENABLED:
          eventName = events.ENABLED
          break
        case MODIFICATION_TYPES.DISABLED:
          eventName = events.DISABLED
          break
        case MODIFICATION_TYPES.REMOVED:
          eventName = events.REMOVED
          break
        default:
          throw new Error("Invalid resource ID list modification type: " +
              modification.type)
      }

      PRIVATE(this).eventBus.fire(eventName, {
        id: modification.id
      })
    }
  }

  /**
   * Creates a list of modifications made to the old resource ID list that led
   * to the creation of the new resource ID list.
   *
   * The resource ID list is a list of account/channel/playlist IDs with each
   * ID followed by a {@code 1} or {@code 0} depending on the resource being
   * marked as enabled or disabled respectively.
   *
   * @param rawOldList The old resource ID list.
   * @param rawNewList The new resource ID list.
   * @return The list of modifications that lead from the old list to the new
   *         list.
   */
  [PRIVATE.getListModifications](
    rawOldList: ?Array<(number|string)>,
    rawNewList: ?Array<(number|string)>
  ): Array<{type: string, id: string}> {
    let oldList = rawOldList || []
    let newList = rawNewList || []

    let oldResources = new Map()
    for (let i = 0; i < oldList.length; i += 2) {
      oldResources.set(oldList[i], oldList[i + 1])
    }

    let modifications = []

    for (let i = 0; i < newList.length; i += 2) {
      if (oldResources.has(newList[i])) {
        if (newList[i + 1] != oldResources.get(newList[i])) {
          let type = newList[i + 1] ?
              MODIFICATION_TYPES.ENABLED :
              MODIFICATION_TYPES.DISABLED
          modifications.push({
            type,
            id: newList[i]
          })
        }
      } else {
        modifications.push({
          type: MODIFICATION_TYPES.ADDED,
          id: newList[i]
        })
      }

      oldResources.delete(newList[i])
    }

    for (let id of oldResources.keys()) {
      modifications.push({
        type: MODIFICATION_TYPES.REMOVED,
        id
      })
    }

    return modifications
  }
}
