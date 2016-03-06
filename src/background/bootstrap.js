
import DependencyInjector from "jurca-di"
import config from "../config"
import EventBus from "../EventBus"
import Database from "./storage/Database"
import SyncStorage from "./storage/SyncStorage"
import ClientFactory from "./youtube-api/ClientFactory"

let di = new DependencyInjector()

di.configure(ClientFactory, config.api.key, config.api.requestTimeout)

di.configure(SyncStorage, EventBus)
di.configure(Database, config.databaseName)
