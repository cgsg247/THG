import {
  isGameActive,
  isPaused,
  setIsGameActive,
  setIsPaused,
  gameMenu,
} from "./menu.js";

import { spectatorMode } from "./camera.js";

let ActiveKeyF2 = false;
export const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  shift: false,
  f2: false,
};

export function keyboardParser(controls) {
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const code = e.code;

    if (key === "w" || key === "ц" || code === "KeyW") keys.w = true;
    if (key === "a" || key === "ф" || code === "KeyA") keys.a = true;
    if (key === "s" || key === "ы" || code === "KeyS") keys.s = true;
    if (key === "d" || key === "в" || code === "KeyD") keys.d = true;

    if (code === "Space" || key === " ") {
      keys.space = true;
      e.preventDefault();
    }
    if (code === "Shift" || e.shiftKey) {
      keys.shift = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    const code = e.code;

    if (key === "w" || key === "ц" || code === "KeyW") keys.w = false;
    if (key === "a" || key === "ф" || code === "KeyA") keys.a = false;
    if (key === "s" || key === "ы" || code === "KeyS") keys.s = false;
    if (key === "d" || key === "в" || code === "KeyD") keys.d = false;

    if (code === "Space") {
      keys.space = false;
      e.preventDefault();
    }
    if (code === "ShiftLeft" || code === "ShiftRight") {
      keys.shift = false;
      e.preventDefault();
    }
    if (code === "KeyF2" || key === "f2") {
      if (!isGameActive || isPaused) return;
      ActiveKeyF2 = !ActiveKeyF2;
      keys.f2 = ActiveKeyF2;
      e.preventDefault();
      spectatorMode(controls);
      console.log("F2 click!");
    }
  });
  window.addEventListener("blur", () => {
    Object.keys(keys).forEach((k) => (keys[k] = false));
    if (isGameActive && !isPaused && controls.isLocked) {
      gameMenu.showPause();
      setIsPaused(true);
      setIsGameActive(false);
      if (controls.isLocked) controls.unlock();
    }
  });
  window.addEventListener("click", () => {
    if (isGameActive && !isPaused && !controls.isLocked) {
      controls.lock();
    }
  });
}
