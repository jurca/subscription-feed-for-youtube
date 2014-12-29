
import "moment";
import AbstractModel from "./AbstractModel";
import Time from "./Time";

/**
 * Model representing a YouTube video.
 */
export default class Video extends AbstractModel {
  /**
   * Initializes the model.
   */
  constructor() {
    super();

    /**
     * Video ID.
     *
     * @type {string}
     */
    this.id = null;

    /**
     * Video title.
     *
     * @type {string}
     */
    this.title = null;

    /**
     * Video description.
     *
     * @type {string}
     */
    this.description = null;

    /**
     * Thumbnails of the video. Each thumbnail is represented by an object with
     * the following fields:
     *
     * * width: number - thumbnail width in pixels
     * * height: number - thumbnail height in pixels
     * * url: string - URL to the thumbnail image
     *
     * @type {Object[]}
     */
    this.thumbnails = [];

    /**
     * The duration of the video.
     *
     * @type {Time}
     */
    this.duration = new Time();

    /**
     * The timestamp the video was uploaded.
     *
     * @type {Moment}
     */
    this.uploaded = moment();

    /**
     * Number of views on the video.
     *
     * @type {number}
     */
    this.views = null;

    /**
     * ID of the channel on which the video was uploaded.
     *
     * @type {string}
     */
    this.channel = null;

    /**
     * IDs of the accounts from which the video is available.
     *
     * @type {string[]}
     */
    this.accounts = [];

    /**
     * IDs of incognito subscriptions from which the video is available.
     *
     * @type {number[]}
     */
    this.incognitoSubscriptions = [];

    /**
     * Set to {@code true} if this video has already been watched, marked as
     * watched or watched by the "watch history" playlist of any account.
     *
     * @type {boolean}
     */
    this.watched = false;

    /**
     * The timestamp of the last time the details of this video was fetched
     * (views count, title, description, thumbnails and duration).
     *
     * @type {Moment}
     */
    this.lastUpdate = moment();
  }
}
