
import DependencyInjector from "jurca-di"
import config from "../config"
import EventBus from "../EventBus"

import PortReceiver from "./PortReceiver"

import AccountsHandler from "./requestHandler/resourceHandler/AccountsHandler"
import RequestHandler from "./requestHandler/RequestHandler"

import Database from "./storage/Database"
import SyncStorage from "./storage/SyncStorage"

import ClientFactory from "./youtube-api/ClientFactory"

let di = new DependencyInjector()

di.configure(PortReceiver, config.portConnectionTimeout)

di.configure(ClientFactory, config.api.key, config.api.requestTimeout)

di.configure(SyncStorage, EventBus)
di.configure(Database, config.databaseName)

di.configure(AccountsHandler, Database, PortReceiver)
di.configure(RequestHandler, AccountsHandler)

let requestHandler = di.get(RequestHandler)
requestHandler.start()
