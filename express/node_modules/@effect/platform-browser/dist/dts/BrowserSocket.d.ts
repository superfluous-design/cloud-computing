/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket";
import * as Layer from "effect/Layer";
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocket: (url: string, options?: {
    readonly closeCodeIsError?: (code: number) => boolean;
}) => Layer.Layer<Socket.Socket>;
/**
 * A WebSocket constructor that uses globalThis.WebSocket.
 *
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocketConstructor: Layer.Layer<Socket.WebSocketConstructor>;
//# sourceMappingURL=BrowserSocket.d.ts.map