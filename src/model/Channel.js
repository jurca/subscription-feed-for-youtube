
import AbstractEntity from "idb-entity/es2015/AbstractEntity"
import objectStore from "../decorator/objectStore"

/**
 * Model for storing information about a YouTube channel the user is subscribed
 * to. The model does not store the reference to the uploads playlist, the
 * information is in the Subscription model.
 */
@objectStore("Channel")
export default class Channel extends AbstractEntity {
  /**
   * The ID of the YouTube channel.
   */
  id: string

  /**
   * The name of the YouTube channel.
   */
  title: string

  /**
   * The thumbnails of the channel. The keys are quality description strings,
   * the values are thumbnail URLs.
   */
  thumbnails: Object<string, string>

  /**
   * The Google account IDs of the accounts that are subscribed to this
   * channel.
   */
  accounts: Array<string>

  /**
   * IDs of the incognito subscriptions to this channel.
   */
  incognitoSubscriptions: Array<number>
}
