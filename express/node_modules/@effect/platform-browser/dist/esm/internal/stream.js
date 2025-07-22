/**
 * @since 1.0.0
 */
import * as Stream from "effect/Stream";
/** @internal */
export const fromEventListenerWindow = (type, options) => Stream.fromEventListener(window, type, options);
/** @internal */
export const fromEventListenerDocument = (type, options) => Stream.fromEventListener(document, type, options);
//# sourceMappingURL=stream.js.map