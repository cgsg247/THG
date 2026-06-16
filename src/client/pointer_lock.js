import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { setSpectatorActive } from "./camera.js";

export let controls = false;

export function pointerLockControl(camera) {
  controls = new PointerLockControls(camera, document.body);

  // Глобальный флаг для отслеживания состояния блокировки
  let isPointerLocked = false;

  // Обработчики событий Pointer Lock
  controls.domElement.addEventListener("pointerlockchange", () => {
    if (!controls.isLocked) {
      setSpectatorActive(false);
      Object.keys(keys).forEach((k) => (keys[k] = false));
    }
    isPointerLocked = controls.isLocked;
    console.log("Pointer lock changed:", isPointerLocked);
  });

  controls.domElement.addEventListener("pointerlockerror", () => {
    console.log("Pointer lock failed, will retry on next click");
  });
}
