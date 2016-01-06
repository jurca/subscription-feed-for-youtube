
import GapiClient from "../GapiClient";
import L10n from "../L10n";
import Connector from "../background/Connector";
import Subscription from "../model/Subscription";
import SubscriptionType from "../model/SubscriptionType";
import Database from "../storage/Database";

const URL_VALIDATOR =
    /^https:\/\/www.youtube.com\/(playlist?|user\/|channel\/)[-_?a-zA-Z0-9&=]*$/;

let db = new Database();

/**
 * Controller for the management of incognito subscriptions in the options.
 *
 * @param {Object} $scope The scope of the options page containig the UI of the
 *        management of incognito subscriptions.
 */
export default class IncognitoSubscriptions {
  constructor($scope) {
    // init localization
    let l10nPrefix = "options_accounts_incognito_";
    $scope.l10n = {
      accounts: {
        incognito: {
          title: L10n.get(`${l10nPrefix}title`),
          addPlaceholder: L10n.get(`${l10nPrefix}addPlaceholder`),
          addingSubscription: L10n.get(`${l10nPrefix}addingSubscription`),
          apiFailure: L10n.get(`${l10nPrefix}apiFailure`),
          invalidUrl: {
            message: L10n.get(`${l10nPrefix}invalidUrl_message`),
            example1: L10n.get(`${l10nPrefix}invalidUrl_example1`),
            example2: L10n.get(`${l10nPrefix}invalidUrl_example2`),
            example3: L10n.get(`${l10nPrefix}invalidUrl_example3`)
          },
          modal: {
            close: L10n.get(`${l10nPrefix}modal_close`),
            invalidChannelUrl: {
              title: L10n.get(`${l10nPrefix}modal_invalidChannelUrl_title`),
              message: L10n.get(`${l10nPrefix}modal_invalidChannelUrl_message`)
            },
            invalidUserUrl: {
              title: L10n.get(`${l10nPrefix}modal_invalidUserUrl_title`),
              message: L10n.get(`${l10nPrefix}modal_invalidUserUrl_message`)
            },
            invalidPlaylistUrl: {
              title: L10n.get(`${l10nPrefix}modal_invalidPlaylistUrl_title`),
              message:
                  L10n.get(`${l10nPrefix}modal_invalidPlaylistUrl_message`)
            }
          }
        }
      }
    };

    // init and load data

    /**
     * The currently loaded subscriptions.
     *
     * @type {Subscription[]}
     */
    this.subscriptions = [];

    /**
     * Set to {@code true} if the subscriptions have been loaded.
     *
     * @type {boolean}
     */
    this.subscriptionsLoaded = false;

    /**
     * Set to {@code true} if an incognito subscription is being added.
     *
     * @type {boolean}
     */
    this.locked = false;

    /**
     * The angular scope in the UI.
     *
     * @type {Object}
     */
    this.scope = $scope;

    (async () => {
      try {
        this.subscriptions = await loadSubscriptions();
        this.subscriptionsLoaded = true;
        $scope.$apply();
      } catch (e) {
        console.error("Failed to load the incognito subscriptions", e,
            e.stack);
      }
    })();
  }

  /**
   * Handles when user adds a new incognito subscription by providing a URL.
   *
   * @param {string} subscriptionUrl The URL provided by the user.
   */
  async addSubscription(subscriptionUrl: string): void {
    if (!this.subscriptionsLoaded || this.locked) {
      return;
    }

    let success;
    try {
      this.locked = true;
      success = await resolveAndAddSubscription(subscriptionUrl);
    } catch (e) {
      console.error("Failed to resolve and add an incognito subscription", e,
          e.stack);
    } finally {
      this.locked = false;
      if (success) {
        this.scope.newSubscriptionUrl = "";
      }
      this.scope.$apply();
    }
  }
}

IncognitoSubscriptions.$inject = ["$scope"];

async function resolveAndAddSubscription(subscriptionUrl: string): boolean {
  let valid = isSubscriptionUrlValid(subscriptionUrl);

  let parsedUrl;
  if (valid) {
    parsedUrl = parseUrl(subscriptionUrl);
    if (parsedUrl.path.includes("playlist") && !parsedUrl.query.list) {
      valid = false;
    }
  }

  if (!valid) {
    let messageBox = angular.element("#invalid-subscription-url");
    if (parseInt(messageBox.css("height"), 10)) {
      return;
    }

    showMessage(messageBox, 10000);
    return;
  }

  let progressMessage = angular.element("#adding-subscription");
  progressMessage.css("height", progressMessage[0].scrollHeight + "px");

  let subscription;
  try {
    subscription = await resolveSubscription(parsedUrl);
  } catch (e) {
    console.error("Encountered an error during subscription URI resolution",
        e, e.stack);
    showMessage(angular.element("#incognito-api-failed"), 10000);
    progressMessage.css("height", "0");
    return;
  }

  if (subscription) {
    try {
      await Connector.ask("incognito-subscriptions.add-requested",
          subscription.serialize());
    } catch (e) {
      console.error("Adding a resolved subscription failed", subscription, e,
          e.stack);
      showMessage(angular.element("#incognito-api-failed"), 10000);
    }
  } else {
    // not found, nothing to do
  }

  progressMessage.css("height", "0");

  return !!subscription;
}

function showMessage(messageElement, timeout: number) {
  if (timeout <= 0) {
    throw new Error(`The timeout must be positive, ${timeout} provided`);
  }

  let element = angular.element(messageElement);
  element.css("height", element[0].scrollHeight + "px");
  setTimeout(() => {
    element.css("height", 0);
  }, timeout);
}

/**
 * Resolves the user, channel or playlist denoted by the provided URL.
 *
 * @param {Object} parsedUrl Parsed URL, as returned by the {@code parseUrl()}
 *        function.
 * @return {?Subscription} The resolved channel, user or playlist as a
 *         {@codelink Subscription} instance, or {@code null} if no such
 *         channel/user/playlist was found.
 */
async function resolveSubscription(parsedUrl: Object) {
  let gapi = new GapiClient();
  let youtubeApi = await gapi.getYouTubeAPI();

  switch (parsedUrl.path[0]) {
    case "playlist":
      return await resolvePlaylist(parsedUrl.query.list, youtubeApi);
    case "user":
      return await resolveUser(parsedUrl.path[1], youtubeApi);
    case "channel":
      return await resolveChannel(parsedUrl.path[1], youtubeApi);
    default:
      throw new Error("Unrecognized URL: " + parseUrl.source);
  }
}

/**
 * Resolves the specified YouTube channel into a {@codelink Subscription}
 * object using the YouTube API. The method shows the
 * {@code invalid-channel-url} modal window (and waits for it to be closed) if
 * the channel is not found.
 *
 * @param {string} channelId The ID of the YouTube channel.
 * @param {Object} youtubeApi YouTube API accessor.
 * @return {?Subscription} The resolved channel as a {@codelink Subscription}
 *         object or {@code null} if the channel does not exist.
 * @throws {Error} Thrown if there is an error during communication with the
 *        YouTube API.
 *
 */
async function resolveChannel(channelId: string, youtubeApi: Object) {
  let apiResponse = await youtubeApi.channels.list({
    part: "id,snippet,contentDetails",
    id: channelId
  });

  if (apiResponse.status !== 200) {
    console.error("YouTube API request failed", apiResponse);
    throw new Error("YouTube API request failed with status" +
        apiResponse.status);
  }

  if (!apiResponse.result.items.length) {
    await showModal("invalid-channel-url");
    return null; // not found
  }

  let data = apiResponse.result.items[0];
  let subscription = new Subscription();
  subscription.load({
    type: "CHANNEL",
    playlist: data.contentDetails.relatedPlaylists.uploads,
    channel: data.id,
    incognito: true
  });

  return subscription;
}

/**
 * Resolves the specified YouTube user into a {@codelink Subscription} object
 * using the YouTube API. The method shows the {@code invalid-user-url} modal
 * window (and waits for it to be closed) if the user is not found.
 *
 * @param {string} username The username of the YouTube user.
 * @param {Object} youtubeApi YouTube API accessor.
 * @return {?Subscription} The resolved user as a {@codelink Subscription}
 *         object or {@code null} if the user does not exist.
 * @throws {Error} Thrown if there is an error during communication with the
 *        YouTube API.
 */
async function resolveUser(username: string, youtubeApi: Object) {
  let apiResponse = await youtubeApi.channels.list({
    part: "id,snippet,contentDetails",
    forUsername: username
  });

  if (apiResponse.status !== 200) {
    console.error("YouTube API request failed", apiResponse);
    throw new Error("YouTube API request failed with status " +
        apiResponse.status);
  }

  if (!apiResponse.result.items.length) {
    await showModal("invalid-user-url");
    return null; // not found
  }

  let data = apiResponse.result.items[0];
  let subscription = new Subscription();
  subscription.load({
    type: "CHANNEL",
    playlist: data.contentDetails.relatedPlaylists.uploads,
    channel: data.id,
    incognito: true
  });

  return subscription;
}

/**
 * Resolves the specified playlist into a {@codelink Subscription} object using
 * the YouTube API. The method shows the {@code invalid-playlist-url} modal
 * window (and waits for it to be closed) if the playlist is not found.
 *
 * @param {string} playlistId The ID of the playlist.
 * @param {Object} youtubeApi YouTube API accessor.
 * @return {?Subscription} The resolved playlist as a {@codelink Subscription}
 *         object or {@code null} if the playlist does not exist.
 * @throws {Error} Thrown if there is an error during communication with the
 *         YouTube API.
 */
async function resolvePlaylist(playlistId: string, youtubeApi: Object) {
  let apiResponse = await youtubeApi.playlists.list({
    part: "snippet,contentDetails",
    id: playlistId
  });

  if (apiResponse.status !== 200) {
    console.error("YouTube API request failed", apiResponse);
    throw new Error("YouTube API request failed with status " +
        apiResponse.status);
  }

  if (!apiResponse.result.items.length) {
    await showModal("invalid-playlist-url");
    return null; // not found
  }

  let data = apiResponse.result.items[0];
  let subscription = new Subscription();
  subscription.load({
    type: "PLAYLIST",
    playlist: data.id,
    channel: data.snippet.channelId,
    incognito: true
  });

  return subscription;
}

/**
 * Shows the modal window identified by the specified ID. The method returns
 * once the window has been closed.
 *
 * @param {string} modalId The ID of the modal window root element.
 */
async function showModal(modalId: string) {
  let wrapper = angular.element("#accounts-content");
  let overlay = angular.element("#modal-overlay");
  let modal = angular.element(`#${modalId}`);

  modal.addClass("active").css("top", (wrapper[0].scrollTop + 35) + "px");
  overlay.addClass("active").css("top", wrapper.scrollTop[0] + "px");

  setTimeout(() => {
    modal.addClass("shown");
    overlay.addClass("shown");
  }, 0);

  overlay.click(closeHandler);
  modal.find("button").click(closeHandler);
  wrapper.on("scroll", scrollHandler);

  let resolve;
  return new Promise(resolveCallback => {
    resolve = resolveCallback;
  });

  /**
   * Callback executed when the close button or overlay is clicked, closes the
   * modal window and overlay.
   */
  function closeHandler() {
    overlay.removeClass("active shown").off();
    modal.removeClass("active shown").find("button").off();
    wrapper.off("scroll", scrollHandler);
    resolve();
  }

  /**
   * Callback executed on content scrolling, updates the position of the modal
   * windows and overlay.
   */
  function scrollHandler() {
    modal.css("top", (wrapper[0].scrollTop + 35) + "px");
    overlay.css("top", wrapper[0].scrollTop + "px");
  }
}

/**
 * Parses the provided (hash-less) URL into an object with the following
 * fields:
 *
 * - protocol: string - the protocol name
 * - hostname: string - the server host name
 * - path: string[] - path split into non-empty path parts
 * - query: Object<string, string> - query parameters
 * - source: string - the url that was parsed
 */
function parseUrl(url: string): Object {
  let protocol = url.substring(0, url.indexOf("://"));
  let protocolEnd = protocol.length + 3;
  let hostname = url.substring(protocolEnd, url.indexOf("/", protocolEnd));
  let hostnameEnd = protocolEnd + hostname.length + 1;
  let path;
  let queryString;
  if (url.includes("?", hostnameEnd)) {
    path = url.substring(hostnameEnd, url.indexOf("?", hostnameEnd));
    queryString = url.substring(url.indexOf("?") + 1);
  } else {
    path = url.substring(hostnameEnd);
    queryString = "";
  }
  let queryParameters = {};
  queryString.split("&").forEach(part => {
    let subParts = part.split("=", 2);
    queryParameters[decodeURIComponent(subParts[0])] =
        decodeURIComponent(subParts[1] || "");
  });

  return {
    protocol: protocol,
    hostname: hostname,
    path: path.split("/").filter(part => !!part),
    query: queryParameters,
    source: url
  };
}

/**
 * Performs the basic validation of the provided YouTube URL that is to be used
 * to add an incognito subscription.
 *
 * @param {string} subscriptionUrl The URL provided by the user.
 * @return {boolean} {@code true} if the URL is valid.
 */
function isSubscriptionUrlValid(subscriptionUrl: string): boolean {
  if (!URL_VALIDATOR.test(subscriptionUrl)) {
    return false;
  }

  if (subscriptionUrl.includes("/playlist?")) {
    return subscriptionUrl.includes("?list=") ||
        subscriptionUrl.includes("&list=");
  }

  return true;
}

/**
 * Loads the incognito YouTube subscriptions from the database.
 *
 * @return {Subscription[]} Incognito YouTube subscriptions of the user.
 */
async function loadSubscriptions(): Array {
  let connection = await db.getConnection();
  let transaction = connection.transaction(["Subscription"], "readonly");
  let storage = transaction.objectStore("Subscription");
  let cursorRequest = storage.openCursor();

  return await new Promise((resolve, reject) => {
    let subscriptions = [];

    cursorRequest.onsuccess = () => {
      let cursor = cursorRequest.result;

      if (cursor) {
        let subscription = new Subscription();
        subscription.load(cursor.value);

        if (subscriptions.incognito) {
          subscriptions.push(subscription);
        }

        cursor.continue();
      } else {
        resolve(subscriptions);
      }
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });
}
