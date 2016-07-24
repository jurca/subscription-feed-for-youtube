
import createPrivate from "namespace-proxy"

const PRIVATE = createPrivate()

/**
 * The pre-processor of HTTP requests made by this extension. The pre-processor
 * adds the {@code Referer} header to the requests made to the Google's APIs to
 * enable proper authentication of the requests.
 */
export default class RequestPreProcessor {
  /**
   * Initializes the request pre-processor.
   *
   * @param referrer The value of the {@code Referer} HTTP header to set to the
   *        requests sent by this extension.
   */
  constructor(referrer: string) {
    /**
     * The value of the {@code Referer} HTTP header to set to the requests sent
     * by this extension.
     *
     * @type {string}
     */
    PRIVATE(this).referrer = referrer

    /**
     * A flag signalling whether the pre-processor has been started and is
     * listening for new HTTP requests.
     *
     * @type {boolean}
     */
    PRIVATE(this).started = false

    Object.seal(this)
  }

  /**
   * Starts the pre-processing of HTTP requests made by this extension by this
   * request pre-processor.
   *
   * Note that there is no stopping the process.
   */
  start() {
    if (PRIVATE(this).started) {
      throw new Error("The request pre-processor has already been started")
    }

    chrome.webRequest.onBeforeSendHeaders.addListener(
      this[PRIVATE.onBeforeSendHeaders].bind(this),
      { urls: [
        "https://www.googleapis.com/auth/youtube/*",
        "https://www.googleapis.com/youtube/v3/*"
      ] },
      ["blocking", "requestHeaders"]
    )

    PRIVATE(this).started = true
  }

  /**
   * Pre-processes an HTTP request that is about to be sent by adding the
   * {@code Referer} HTTP header if the {@code Chrome-Extension-Id} header is
   * present and set to the extension's ID. The {@code Referer} header will be
   * set to the value passed to the constructor of the pre-processor.
   *
   * @param requestDetails The details about the request being made.
   * @return The processed request details with the headers updated.
   */
  [PRIVATE.onBeforeSendHeaders](
    requestDetails: {
      requestHeaders: Array<{
        name: string, value: ?string, binaryValue: ?string
      }>
    }
  ): {
    requestHeaders: Array<{
      name: string, value: ?string, binaryValue: ?string
    }>
  } {
    let requestHeaders = requestDetails.requestHeaders
    let isOwnRequest = requestHeaders.some(
      header => (header.name.toLowerCase() === "chrome-extension-id") &&
          (header.value === chrome.runtime.id)
    )
    if (!isOwnRequest) {
      return {}
    }

    let referrerSet = false
    for (let header of requestHeaders) {
      if (header.name.toLowerCase() === "referer") {
        delete header.binaryValue
        header.value = PRIVATE(this).referrer
        referrerSet = true
        break
      }
    }

    if (!referrerSet) {
      requestHeaders.push({
        name: "Referer",
        value: PRIVATE(this).referrer
      })
    }

    return {
      requestHeaders
    }
  }
}
