
import DependencyInjector from "jurca-di"
import BackgroundConnector from "../BackgroundConnector"

export default (di: DependencyInjector) => {
  let connector = di.get(BackgroundConnector)
  connector.list("accounts").then((accounts) => {
    let listContainer = document.getElementById("accounts")
    listContainer.innerText = JSON.stringify(accounts, null, 4)
  }).catch((error) => {
    let listContainer = document.getElementById("accounts")
    listContainer.innerText = JSON.stringify(error, null, 4)
  })

  document.getElementById("addAccount").addEventListener("click", () => {
    document.getElementById("addAccount").innerText = "TODO"
  })
}
