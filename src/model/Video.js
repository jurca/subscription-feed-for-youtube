
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
  channel: string

  /**
   * Google account IDs of the accounts from which the video is available.
   */
  accounts: Array<string>

  /**
   * IDs of incognito subscriptions from which the video is available.
   */
  incognitoSubscriptions: Array<number>

  /**
   * Set to {@code 1} if this video has already been watched, marked as watched
   * or watched by the "watch history" playlist of any account; set to
   * {@code 0} otherwise.
   */
  watched: number
}
