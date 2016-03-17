
import AbstractEntity from "idb-entity/es2015/AbstractEntity"
import objectStore from "../decorator/objectStore"

/**
 * Model representing a YouTube video.
 */
@objectStore("Video")
export default class Video extends AbstractEntity {
  /**
   * Video ID.
   */
  id: string

  /**
   * Video title.
   */
  title: string

  /**
   * Video description.
   */
  description: string

  /**
   * The moment at which the video has been uploaded and published.
   */
  publishedAt: Date

  /**
   * Thumbnails of the video. The keys are quality description strings.
   *
   * The thumbnail qualities, sorted from the lowest to the highest, with their
   * dimensions (at the moment of writing this) attached, are as follows:
   *
   * - {@code default} - 120 &times; 90
   * - {@code medium} - 320 &times; 180
   * - {@code high} - 480 &times; 360
   * - {@code standard} - 640 &times; 480
   * - {@code maxres} - 1280 &times; 720
   */
  thumbnails: Object<string, {url: string, width: number, height: number}>

  /**
   * Duration of the video in seconds.
   */
  duration: number

  /**
   * Number of views of the video.
   */
  viewCount: number

  /**
   * ID of the YouTube channel on which the video was uploaded.
   */
  channelId: string

  /**
   * Google account IDs of the accounts from which the video is available.
   */
  accountIds: Array<string>

  /**
   * IDs of incognito subscriptions from which the video is available.
   */
  incognitoSubscriptionIds: Array<number>

  /**
   * Set to {@code 1} if this video has already been watched, marked as watched
   * or watched by the "watch history" playlist of any account; set to
   * {@code 0} otherwise.
   */
  watched: number

  /**
   * Set to {@code 1} if at least one YouTube account subscription or incognito
   * subscription from which this video originated is currently enabled,
   * otherwise set to {@code 0}.
   */
  isEnabled: number

  /**
   * The moment the video's view count has been updated last time.
   */
  lastUpdate: Date
}
