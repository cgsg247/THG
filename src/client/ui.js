import { Pane } from "tweakpane";
import { setWireframe } from "./model_load";

let pane = false;

export function initUI(controls) {
  pane = new Pane({
    title: "Geometry control",
    container: document.getElementById("panel"),
  });

  const panelDiv = document.getElementById("panel");
  if (panelDiv) {
    panelDiv.addEventListener("mousedown", (e) => e.stopPropagation());
    panelDiv.addEventListener("mouseup", (e) => e.stopPropagation());
  }

  pane.on("change", () => {
    if (controls && controls.isLocked) {
      controls.unlock();
    }
  });
}

// Player speed ​​parametrs
export const PARAMS = {
  speed: 6,
};

// Player jump parameters
export const jumpParams = {
  force: 5.5,
  groundCheck: 1.2,
  playerHeight: 0.8,
};

// Enemy speed parametrs
export const ENEMY_PARAMS = { speed: 2.0 };

// Wireframe
export const isWireframe = {
  isActive: false,
};

export function addUIParts() {
  // pane.addBinding(PARAMS, "speed", {
  //   min: 0.1,
  //   max: 20,
  //   step: 0.05,
  // });
  // pane.addBinding(jumpParams, "force", { min: 3, max: 10, step: 0.1 });
  // pane.addBinding(jumpParams, "groundCheck", {
  //   min: 0.5,
  //   max: 1.2,
  //   step: 0.05,
  // });
  // pane.addBinding(jumpParams, "playerHeight", {
  //   min: 0.1,
  //   max: 1.0,
  //   step: 0.05,
  // });
  // pane.addBinding(ENEMY_PARAMS, "enemy speed", { min: 0.5, max: 5, step: 0.1 });

  const wireframeCheck = pane.addBinding(isWireframe, "isActive", {
    label: "WireFrame",
  });

  wireframeCheck.on("change", (ev) => {
    setWireframe(ev.value);
  });
}
