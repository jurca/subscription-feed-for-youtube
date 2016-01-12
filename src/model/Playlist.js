
import AbstractEntity from "idb-entity/es2015/AbstractEntity"
import objectStore from "../decorator/objectStore"

/**
 * The model for storing information about playlists.
 */
@objectStore("Playlist")
export default class Playlist extends AbstractEntity {
  /**
   * The ID of the playlist.
   */
  id: string

  /**
   * The playlist name.
   */
  title: string

  /**
   * The playlist description.
   */
  description: string

  /**
   * Total number of videos in this playlist. This number is provided by the
   * YouTube API.
   */
  videoCount: number

  /**
   * The thumbnails of the playlist. The keys are quality description strings.
   *
   * The thumbnail qualities, sorted from the lowest to the highest, with their
   * dimensions (at the moment of writing this) attached, are as follows:
   *
   * - {@code default} - 120 &times; 90
   * - {@code medium} - 320 &times; 180
   * - {@code high} - 480 &times; 360
   * - {@code standard} - 640 &times; 480
   * - {@code maxres} - 1280 &times; 720
   *
   * The thumbnails may change with every video added to the playlist.
   */
  thumbnails: Object<string, {url: string, width: number, height: number}>

  /**
   * The Google account IDs of the accounts that are subscribed to this
   * playlist.
   */
  accountIds: Array<string>

  /**
   * IDs of the incognito subscriptions to this playlist.
   */
  incognitoSubscriptionIds: Array<number>
}
