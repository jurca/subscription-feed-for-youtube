
import DependencyInjector from "jurca-di"
import config from "../config"
import EventBus from "../EventBus"

import AccountsHandler from "./requestHandler/resourceHandler/AccountsHandler"
import RequestHandler from "./requestHandler/RequestHandler"

import Database from "./storage/Database"
import SyncStorage from "./storage/SyncStorage"

import ClientFactory from "./youtube-api/ClientFactory"

let di = new DependencyInjector()

di.configure(ClientFactory, config.api.key, config.api.requestTimeout)

di.configure(SyncStorage, EventBus)
di.configure(Database, config.databaseName)

di.configure(AccountsHandler, Database)
di.configure(RequestHandler, AccountsHandler)

let requestHandler = di.get(RequestHandler)
requestHandler.start()
