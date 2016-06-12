
import DependencyInjector from "jurca-di"
import BackgroundConnector from "../BackgroundConnector"

import placeholderUI from "./placeholderUI"

let di = new DependencyInjector()

di.configure(BackgroundConnector)

placeholderUI(di)
