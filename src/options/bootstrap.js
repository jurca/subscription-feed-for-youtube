
import DependencyInjector from "jurca-di"
import BackgroundConnector from "../BackgroundConnector"
import PortFactory from "../PortFactory"

import placeholderUI from "./placeholderUI"

let di = new DependencyInjector()

di.configure(PortFactory, 'options')
di.configure(BackgroundConnector, PortFactory)

placeholderUI(di)
