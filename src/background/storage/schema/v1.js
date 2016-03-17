
import Account from "../../../model/Account"
import Channel from "../../../model/Channel"
import Playlist from "../../../model/Playlist"
import Subscription from "../../../model/Subscription"
import Video from "../../../model/Video"

export default {
  version: 1,
  objectStores: [{
    name: Account.objectStore,
    keyPath: "id",
    autoIncrement: false,
    indexes: []
  }, {
    name: Channel.objectStore,
    keyPath: "id",
    autoIncrement: false,
    indexes: [{
      name: "accountIds",
      keyPath: "accountIds",
      unique: false,
      multiEntry: true
    }, {
      name: "incognitoSubscriptionIds",
      keyPath: "incognitoSubscriptionIds",
      unique: false,
      multiEntry: true
    }]
  }, {
    name: Playlist.objectStore,
    keyPath: "id",
    autoIncrement: false,
    indexes: [{
      name: "accountIds",
      keyPath: "accountIds",
      unique: false,
      multiEntry: true
    }, {
      name: "incognitoSubscriptionIds",
      keyPath: "incognitoSubscriptionIds",
      unique: false,
      multiEntry: true
    }]
  }, {
    name: Subscription.objectStore,
    keyPath: "id",
    autoIncrement: true,
    indexes: [{
      name: "isIncognito",
      keyPath: "isIncognito",
      unique: false,
      multiEntry: false
    }, {
      name: "subscriptions to update",
      keyPath: ["isIncognito", "accountId"],
      unique: false,
      multiEntry: false
    }]
  }, {
    name: Video.objectStore,
    keyPath: "id",
    autoIncrement: false,
    indexes: [{
      name: "publishedAt",
      keyPath: "publishedAt",
      unique: false,
      multiEntry: false
    }, {
      name: "accountIds",
      keyPath: "accountIds",
      unique: false,
      multiEntry: true
    }, {
      name: "incognitoSubscriptionIds",
      keyPath: "incognitoSubscriptionIds",
      unique: false,
      multiEntry: true
    }, {
      name: "lastUpdate",
      keyPath: ["lastUpdate"],
      unique: false,
      multiEntry: false
    }, {
      name: "feed",
      keyPath: ["isEnabled", "watched", "publishedAt", "id"],
      unique: false,
      multiEntry: false
    }]
  }]
}
