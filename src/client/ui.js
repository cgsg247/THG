import { Pane } from "tweakpane";

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

export function addUIParts(PARAMS, jumpParams) {
  pane.addBinding(PARAMS, "speed", {
    min: 0.1,
    max: 20,
    step: 0.05,
  });
  pane.addBinding(jumpParams, "force", { min: 3, max: 10, step: 0.1 });
  pane.addBinding(jumpParams, "groundCheck", {
    min: 0.5,
    max: 1.2,
    step: 0.05,
  });
  pane.addBinding(jumpParams, "playerHeight", {
    min: 0.1,
    max: 1.0,
    step: 0.05,
  });
}
