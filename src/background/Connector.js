
/**
 * The {@codelink Connector} provides a simple asynchronous API for sending
 * messages between views of the extension (usually used for communication with
 * the background script).
 */
export default class Connector {
  /**
   * Registers the provided listener to be executed when an event is sent. The
   * listener will receive the event name and data as arguments. Any vaule
   * returned (if not {@code undefined}) or error thrown by the listener will
   * be sent to as a response.
   *
   * @param {function(string, *): *} listener The listener to register.
   */
  static addListener(listener: Function): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (sender.id !== chrome.runtime.id) {
        console.warn("Received a message sent by someone else!", message,
            sender);
        return;
      }

      let response;
      try {
        response = Promise.resolve(listener(message.event, message.data));
      } catch (e) {
        response = e;
      }

      if (sendResponse && (response !== undefined)) {
        sendResponse(response);
      }
    });
  }

  /**
   * Sends the speciifed event and data, not expecting a response. The event is
   * sent asynchronously.
   *
   * @param {string} event The event to send.
   * @param {*} Additional data of the event.
   */
  static tell(event: string, data): void {
    setTimeout(() => {
      chrome.runtime.sendMessage(chrome.runtime.id, {
        event: event,
        data: data
      });
    }, 0);
  }

  /**
   * Sends the specified event and data and waits for a response, then returns
   * the response. The event is send asynchronously.
   *
   * @param {string} event The event to send.
   * @param {*} data Additional data of the event.
   * @param {number=} timeout The number of milliseconds the method should wait
   *        for a response. Defaults to 15 seconds.
   * @return {*} The reply value returned by the listener.
   * @throws {Error} Throws if the handler that received and processed the
   *         message threw an error.
   */
  static async ask(event: string, data, timeout: number = 15000) {
    if (timeout <= 0) {
      throw new Error("The timeout must be positive");
    }

    return await new Promise((resolve, reject) => {
      setTimeout(() => {
        chrome.runtime.sendMessage(chrome.runtime.id, {
          event: event,
          data: data
        }, {}, (response) => {
          if (response instanceof Error) {
            reject(response);
          } else {
            resolve(response);
          }
        });
      }, 0);

      setTimeout(() => {
        reject(new Error(`The call exceeded the timeout ${timeout} ms`));
      }, timeout);
    });
  }
}
