
import DependencyInjector from "jurca-di"
import BackgroundConnector from "../BackgroundConnector"

export default (di: DependencyInjector) => {
  let connector = di.get(BackgroundConnector)
  loadAccounts().then((accountConnected) => {
    addAccountButton.disabled = accountConnected
    if (accountConnected) {
      addAccountButton.title = "Only one account can be connected at a time"
    }
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
          addAccountButton.textContent = "Authorized, saving..."
          break
        case "FETCHING_PROFILE_INFO":
          addAccountButton.textContent = "Fetching profile info..."
          break
        case "ADDED":
          addAccountButton.textContent = "Account added"
          break
        default:
          console.warn("Unknown message", message)
      }
    })
    port.onDisconnect.addListener(() => {
      loadAccounts().then((accountConnected) => {
        addAccountButton.disabled = accountConnected
        if (accountConnected) {
          addAccountButton.title = "Only one account can be connected at a time"
        }
      })
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
  
  function loadAccounts() {
    let listContainer = document.getElementById("accounts")
    listContainer.textContent = "Loading..."
    return connector.list("accounts").then((accounts) => {
      listContainer.textContent = JSON.stringify(accounts, null, 4)
      return !!accounts.length
    }).catch((error) => {
      let listContainer = document.getElementById("accounts")
      listContainer.textContent = JSON.stringify(error, null, 4)
    })
  }
}

