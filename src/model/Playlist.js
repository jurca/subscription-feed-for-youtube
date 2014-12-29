
import "moment";
import PrimaryKey from "./annotation/PrimaryKey";
import AbstractModel from "./AbstractModel";

/**
 * The model for storing information about playlists. This model is used for
 * the "uploads" and "watch history" playlists.
 */
@PrimaryKey("id")
export default class Playlist extends AbstractModel {
  /**
   * Initializes the model.
   */
  constructor() {
    super();

    /**
     * The ID of the playlist.
     *
     * @type {string}
     */
    this.id = null;

    /**
     * The last moment the videos of added to this playlist have been fetched
     * from YouTube API.
     *
     * @type {Moment}
     */
    this.lastUpdate = moment();
  }
}
