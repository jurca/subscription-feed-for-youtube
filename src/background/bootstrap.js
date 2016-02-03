
import DependencyInjector from "jurca-di"
import config from "../config"
import ClientFactory from "./youtube-api/ClientFactory"

let di = new DependencyInjector()

di.configure(ClientFactory, config.api.key, config.api.requestTimeout)
