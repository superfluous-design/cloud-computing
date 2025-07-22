/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import { identity } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform-browser/Geolocation");
/**
 * @since 1.0.0
 * @category tags
 */
export const Geolocation = /*#__PURE__*/Context.GenericTag("@effect/platform-browser/Geolocation");
/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform-browser/Geolocation/GeolocationError");
/**
 * @since 1.0.0
 * @category errors
 */
export class GeolocationError extends /*#__PURE__*/TypeIdError(ErrorTypeId, "GeolocationError") {
  get message() {
    return this.reason;
  }
}
const makeQueue = options => Queue.sliding(options?.bufferSize ?? 16).pipe(Effect.tap(queue => Effect.acquireRelease(Effect.sync(() => navigator.geolocation.watchPosition(position => queue.unsafeOffer(Either.right(position)), cause => {
  if (cause.code === cause.PERMISSION_DENIED) {
    queue.unsafeOffer(Either.left(new GeolocationError({
      reason: "PermissionDenied",
      cause
    })));
  } else if (cause.code === cause.TIMEOUT) {
    queue.unsafeOffer(Either.left(new GeolocationError({
      reason: "Timeout",
      cause
    })));
  }
}, options)), handleId => Effect.sync(() => navigator.geolocation.clearWatch(handleId)))));
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = /*#__PURE__*/Layer.succeed(Geolocation, /*#__PURE__*/Geolocation.of({
  [TypeId]: TypeId,
  getCurrentPosition: options => makeQueue(options).pipe(Effect.flatMap(Queue.take), Effect.flatten, Effect.scoped),
  watchPosition: options => makeQueue(options).pipe(Effect.map(Stream.fromQueue), Stream.unwrapScoped, Stream.mapEffect(identity))
}));
/**
 * @since 1.0.0
 * @category accessors
 */
export const watchPosition = options => Stream.unwrap(Effect.map(Geolocation, geolocation => geolocation.watchPosition(options)));
//# sourceMappingURL=Geolocation.js.map