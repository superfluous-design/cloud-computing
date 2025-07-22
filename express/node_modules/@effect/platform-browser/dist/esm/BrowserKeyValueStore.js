import * as internal from "./internal/keyValueStore.js";
/**
 * Creates a KeyValueStore layer that uses the browser's localStorage api. Values are stored between sessions.
 *
 * @since 1.0.0
 * @category models
 */
export const layerLocalStorage = internal.layerLocalStorage;
/**
 * Creates a KeyValueStore layer that uses the browser's sessionStorage api. Values are stored only for the current session.
 *
 * @since 1.0.0
 * @category models
 */
export const layerSessionStorage = internal.layerSessionStorage;
//# sourceMappingURL=BrowserKeyValueStore.js.map