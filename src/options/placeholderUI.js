
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

  let addAccountButton = document.getElementById("addAccount")
  addAccountButton.addEventListener("click", async () => {
    addAccountButton.innerText = "Connecting..."
    addAccountButton.disabled = true

    let port = connector.createPort()
    port.onMessage.addListener((message) => {
      console.log(message)
      if (message.msg) {
        port.postMessage({ reply: "thank you" })
      }
    })
    port.onDisconnect.addListener(() => {
      console.log("port disconnected")
    })
    let response = await connector.create("accounts", {
      portName: port.name
    })
    console.log(response)
  })
}
