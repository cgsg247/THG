import * as THREE from "three";

let isFlashlightOn = true;
let flashlight = null;
let flashlightTarget = null;
const flashlightUI = document.createElement("div");

function updateFlashlightUI(flashlightUI, state) {
  flashlightUI.innerHTML = `🔦 Фонарик: ${state ? "ВКЛ" : "ВЫКЛ"}`;
  flashlightUI.style.borderLeftColor = state ? "#00ff00" : "#ff0000";
}

export function createFlashlight(scene, camera) {
  // Создание фонарика
  flashlight = new THREE.SpotLight(0xffeedd);
  flashlight.intensity = 3.0;
  flashlight.distance = 20;
  flashlight.angle = 0.6;
  flashlight.penumbra = 0.5;
  flashlight.decay = 1.0;
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.width = 1024;
  flashlight.shadow.mapSize.height = 1024;
  flashlight.shadow.bias = -0.0001;

  flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0, -5);
  camera.add(flashlightTarget);
  scene.add(flashlightTarget);
  flashlight.target = flashlightTarget;

  camera.add(flashlight);
  scene.add(flashlight);

  return flashlight;
}

export function updateFlashlightPosition(camera) {
  if (!flashlight || !flashlightTarget) return;

  flashlight.position.copy(camera.position);
  flashlight.position.y -= 0.2;

  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  flashlightTarget.position.copy(
    camera.position.clone().add(dir.multiplyScalar(10)),
  );
}

export function createFlashlightUI() {
  flashlightUI.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    color: white;
    background: rgba(0,0,0,0.7);
    padding: 8px 15px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 14px;
    z-index: 1000;
    border-left: 3px solid #00ff00;
    pointer-events: none;
`;
  updateFlashlightUI(flashlightUI, isFlashlightOn);
  document.body.appendChild(flashlightUI);
}

export function enableFlashlightUI() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "а") {
      e.preventDefault();
      isFlashlightOn = !isFlashlightOn;
      flashlight.intensity = isFlashlightOn ? 3.0 : 0;
      updateFlashlightUI(flashlightUI, isFlashlightOn);
      console.log(`Фонарик ${isFlashlightOn ? "включён" : "выключен"}`);
    }
  });
}
