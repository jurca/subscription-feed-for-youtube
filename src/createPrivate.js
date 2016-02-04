
/**
 * Creates a function that returns a proxy object for easier manipulation of
 * private properties of the provided instance. The proxies are generated
 * lazily and cached in a weak map.
 *
 * The returned function should not be exposed outside of the module defining
 * the class to keep the private fields private.
 *
 * @return A function that returns a proxy object for easier manipulation of
 *         private properties of the provided instance.
 */
export default function createPrivate(): (instance: Object) => Proxy {
  let proxies = new WeakMap()
  let symbols = new Map()

  return (instance) => {
    if (proxies.has(instance)) {
      return proxies.get(instance)
    }

    let proxy = createProxy(instance, symbols)
    proxies.set(instance, proxy)
    return proxy
  }
}

/**
 * Creates a proxy for retrieving and setting the values of the private
 * properties of the provided instance.
 *
 * @param instance The instance for which the proxy should be created.
 * @param symbols Cache of private property symbols.
 * @return The proxy for convenient setting and retrieving of private
 *         properties of the specified instance.
 */
function createProxy(instance: Object, symbols: Map<string, symbol>): Proxy {
  return new Proxy(instance, {
    set: (target, propertyName, value) => {
      let symbol = getSymbol(symbols, propertyName);
      instance[symbol] = value
      return true
    },

    get: (target, propertyName) => {
      let symbol = getSymbol(symbols, propertyName)
      return instance[symbol]
    }
  })
}

/**
 * Retrieves or generates and caches the private field symbol for the private
 * property of the specified name.
 *
 * @param symbols Cache of private property symbols.
 * @param propertyName The name of the private property.
 * @return The symbol to use for setting and retrieving the value of the
 *         specified private property.
 */
function getSymbol(symbols: Map<string, symbol>, propertyName: string):
    symbol {
  if (symbols.has(propertyName)) {
    return symbols.get(propertyName)
  }

  let symbol = Symbol(propertyName)
  symbols.set(propertyName, symbol)
  return symbol
}
