
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
   */
  thumbnails: Object<string, {url: string, width: number, height: number}>
}
