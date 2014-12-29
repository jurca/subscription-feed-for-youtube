
import "moment";
import PrimaryKey from "./annotation/PrimaryKey";
import AbstractModel from "./AbstractModel";

/**
 * Model for storing information about a YouTube channel the user is subscribed
 * to. The model does not store the reference to the uploads playlist, the
 * information is in the Subscription model.
 */
@PrimaryKey("id")
export default class Channel extends AbstractModel {
  /**
   * Initializes the model.
   */
  constructor() {
    super();

    /**
     * The ID of the channel.
     *
     * @type {string}
     */
    this.id = null;

    /**
     * The name of the YouTube channel.
     *
     * @type {string}
     */
    this.name = null;

    /**
     * Total number of videos uploaded by this channel. This number is provided
     * by the YouTube API.
     *
     * @type {number}
     */
    this.totalVideos = null;

    /**
     * The thumbnails of the channel avatar. Each thumbnails is represented by
     * a URL to the thumbnail image.
     *
     * @type {string[]}
     */
    this.thumbnails = [];

    /**
     * The IDs of the accounts that are subscribed to this channel.
     *
     * @type {string[]}
     */
    this.accounts = [];

    /**
     * IDs of the incognito subscriptions to this channel.
     *
     * @type {number[]}
     */
    this.incognitoSubscriptions = [];

    /**
     * The timestamp of the last time the videos uploaded by this channel and
     * the total video count has been retrieved from the YouTube API.
     *
     * @type {Moment}
     */
    this.lastUpdate = moment();
  }
}
