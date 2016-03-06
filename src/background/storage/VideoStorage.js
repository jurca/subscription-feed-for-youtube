
import KeyRange from "indexed-db.es6/es2015/object-store/KeyRange"
import Transaction from "indexed-db.es6/es2015/transaction/Transaction"
import createPrivate from "../../createPrivate"
import Account from "../../model/Account"
import AccountState from "../../model/AccountState"
import Subscription from "../../model/Subscription"
import SubscriptionState from "../../model/SubscriptionState"
import Video from "../../model/Video"

const PRIVATE = createPrivate()

/**
 * Utility for easier manipulation of the videos in the database.
 */
export default class VideoStorage {
  /**
   * Updates the {@code isEnabled} flag of all videos that are related to the
   * provided account or incognito subscription that has just been enabled or
   * disabled, according to the current enabled-state of each account and
   * incognito subscription each video is related to.
   *
   * @param transaction The current database transaction to use. The
   *        transaction must be active.
   * @param modifiedAccount The user's Google account that was modified, or
   *        {@code null} if an incognito subscription has been modified
   *        instead.
   * @param modifiedIncognitoSubscription The incognito subscription that was
   *        modified, or {@code null} if an account has been modified instead.
   * @param allAccounts All known user's accounts. The accounts must be
   *        up-to-date with correct states.
   * @param allIncognitoSubscription All known incognito subscriptions. The
   *        subscriptions must be up-to-date with correct states.
   * @return A synchronous promise that will resolve once all video flags have
   *         been updated.
   */
  updateEnabledFlag(
    transaction: Transaction,
    modifiedAccount: ?Account,
    modifiedIncognitoSubscription: ?Subscription,
    allAccounts: Array<Account>,
    allIncognitoSubscription: Array<Subscription>
  ): PromiseSync<number> {
    let isValid = (modifiedAccount && !modifiedIncognitoSubscription) ||
        (!modifiedAccount && modifiedIncognitoSubscription)
    if (!isValid) {
      throw new Error("Either a modified account or a modified incognito " +
          "subscription may")
    }

    let enabledNow = (
      (
        modifiedAccount && (modifiedAccount.state !== AccountState.DISABLED)
      ) || (modifiedIncognitoSubscription.state !== SubscriptionState.DISABLED)
    ) ? 1 : 0
    let enabledAccounts = allAccounts.filter((account) => {
      return account.state !== AccountState.DISABLED
    });
    let enabledIncognitoSubscriptions = allIncognitoSubscription.filter(
      subscription => subscription.state !== SubscriptionState.DISABLED
    )

    let videoStore = transaction.getObjectStore(Video.objectStore)
    let index
    let range
    if (modifiedAccount) {
      index = videoStore.getIndex("accountIds")
      range = KeyRange.only(modifiedAccount.id)
    } else {
      index = videoStore.getIndex("incognitoSubscriptionIds")
      range = KeyRange.only(modifiedIncognitoSubscription.id)
    }

    return index.openCursor(range, "next", true, (cursor) => {
      let video = cursor.record

      let newlyEnabled = this[PRIVATE.isEnabled](
        enabledNow,
        enabledAccounts,
        enabledIncognitoSubscriptions
      )
      if (newlyEnabled !== video.isEnabled) {
        cursor.update(video)
      }

      cursor.advance()
    })
  }

  /**
   * Determines whether the video should be marked as enabled or disabled. A
   * video is enabled if at least one account or incognito subscription the
   * video is related to is enabled.
   *
   * @param enabledNow {@code 1} if the video will be enabled now if the choice
   *        was only up to the last modified account or incognito subscription.
   * @param video The video that will become enabled or disabled as a result of
   *        enabling or disabling an account or incognito subscription.
   * @param enabledAccounts All currently enabled user's accounts.
   * @param enabledIncognitoSubscriptions All currently enabled incognito
   *        subscriptions.
   * @return A {@code 1} if the video should be marked as enabled, {@code 0}
   *         otherwise.
   */
  [PRIVATE.isEnabled](enabledNow: number, video: Video,
      enabledAccounts: Array<Account>,
      enabledIncognitoSubscriptions: Array<Subscription>): number {
    if (enabledNow) { // a single account or subscription is enough
      return 1
    }

    for (let account of enabledAccounts) {
      if (video.accountIds.includes(account.id)) {
        return 1
      }
    }
    for (let subscription of enabledIncognitoSubscriptions) {
      if (video.incognitoSubscriptionIds.includes(subscription.id)) {
        return 1
      }
    }

    // all accounts and incognito subscriptions related to the video are
    // disabled
    return 0
  }
}
