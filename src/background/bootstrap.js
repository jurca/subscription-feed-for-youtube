
import DependencyInjector from "jurca-di"
import config from "../config"
import EventBus from "../EventBus"

import PortReceiver from "./PortReceiver"

import AccountsHandler from "./requestHandler/resourceHandler/AccountsHandler"
import RequestHandler from "./requestHandler/RequestHandler"

import Database from "./storage/Database"
import SyncStorage from "./storage/SyncStorage"
import AccountsSynchronizer from "./storage/synchronization/AccountsSynchronizer"
import IncognitoSubscriptionsSynchronizer from "./storage/synchronization/IncognitoSubscriptionsSynchronizer"

import ClientFactory from "./youtube-api/ClientFactory"

let di = new DependencyInjector()

// configure the dependencies
di.configure(PortReceiver, config.portConnectionTimeout)

di.configure(ClientFactory, config.api.key, config.api.requestTimeout)

di.configure(SyncStorage, EventBus)
di.configure(Database, config.databaseName)
di.configure(AccountsSynchronizer, EventBus, ClientFactory, SyncStorage, Database)
di.configure(IncognitoSubscriptionsSynchronizer)

di.configure(AccountsHandler, Database, PortReceiver, SyncStorage, EventBus)
di.configure(RequestHandler, AccountsHandler)

// initialize the application
di.get(IncognitoSubscriptionsSynchronizer)
di.get(AccountsSynchronizer)
let requestHandler = di.get(RequestHandler)
requestHandler.start()
