
import DependencyInjector from "jurca-di"
import BackgroundConnector from "../BackgroundConnector"

let di = new DependencyInjector()

di.configure(BackgroundConnector)

let connector = di.get(BackgroundConnector)
