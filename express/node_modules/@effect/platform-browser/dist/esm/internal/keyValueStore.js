import * as KeyValueStore from "@effect/platform/KeyValueStore";
/** @internal  */
export const layerSessionStorage = /*#__PURE__*/KeyValueStore.layerStorage(() => sessionStorage);
/** @internal  */
export const layerLocalStorage = /*#__PURE__*/KeyValueStore.layerStorage(() => localStorage);
//# sourceMappingURL=keyValueStore.js.map