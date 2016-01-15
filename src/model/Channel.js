
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
   *
   * The thumbnail qualities, sorted from the lowest to the highest, with their
   * dimensions (at the moment of writing this) attached, are as follows:
   *
   * - {@code default} - 88 &times; 88 pixels
   * - {@code high} - 240 &times; 240 pixels
   */
  thumbnails: Object<string, string>

  /**
   * ID of the playlist containing the uploaded videos.
   */
  uploadsPlaylistId: string

  /**
   * The Google account IDs of the accounts that are subscribed to this
   * channel.
   */
  accountIds: Array<string>

  /**
   * IDs of the incognito subscriptions to this channel.
   */
  incognitoSubscriptionIds: Array<number>
}
