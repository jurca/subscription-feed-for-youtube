
import DependencyInjector from "jurca-di"
import BackgroundConnector from "../BackgroundConnector"

export default (di: DependencyInjector) => {
  let connector = di.get(BackgroundConnector)
  connector.list("accounts").then((accounts) => {
    let listContainer = document.getElementById("accounts")
    listContainer.textContent = JSON.stringify(accounts, null, 4)
  }).catch((error) => {
    let listContainer = document.getElementById("accounts")
    listContainer.textContent = JSON.stringify(error, null, 4)
  })

  let addAccountButton = document.getElementById("addAccount")
  addAccountButton.addEventListener("click", async () => {
    addAccountButton.textContent = "Initializing..."
    addAccountButton.disabled = true

    let port = connector.createPort()
    port.onMessage.addListener((message) => {
      switch (message.state) {
        case "AUTHORIZATION_REJECTED":
          addAccountButton.textContent = "You rejected authorization"
          break
        case "AUTHORIZED":
          addAccountButton.textContent = "Authorized, fetching profile info..."
          break;
        default:
          console.warn("Unknown message", message)
      }
    })
    port.onDisconnect.addListener(() => {
      console.log("port disconnected")
      addAccountButton.disabled = false
    })

    await connector.create("accounts", {
      portName: port.name
    })
    addAccountButton.textContent = "Authorizing..."
  })

  let dropAuthTokenButton = document.getElementById("dropAuthToken")
  dropAuthTokenButton.addEventListener("click", () => {
    dropAuthTokenButton.disabled = true
    chrome.identity.getAuthToken({}, (token) => {
      if (!token) {
        dropAuthTokenButton.disabled = false
        return
      }

      chrome.identity.removeCachedAuthToken({ token }, () => {
        dropAuthTokenButton.disabled = false
      })
    })
  })
}
