import * as THREE from "three";

export let isSpectatorActive = false;

export function initCamera() {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  return camera;
}

export function setSpectatorActive(value) {
  isSpectatorActive = value;
}

export function spectatorMode(controls) {
  isSpectatorActive = !isSpectatorActive;

  if (isSpectatorActive) {
    controls.lock();
    console.log("Режим наблюдателя включен");
  } else {
    controls.unlock();
    console.log("Режим наблюдателя выключен");
  }
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const moveVector = new THREE.Vector3();

export function updateSpectatorCamera(camera, controls, delta, keys, PARAMS) {
  if (!isSpectatorActive || !controls.isLocked) return;

  const zMove = Number(keys.w) - Number(keys.s);
  const xMove = Number(keys.d) - Number(keys.a);

  if (zMove === 0 && xMove === 0) return;

  camera.getWorldDirection(forward);
  forward.normalize();

  right.setFromMatrixColumn(camera.matrix, 0);

  moveVector.set(0, 0, 0);

  if (zMove !== 0) moveVector.addScaledVector(forward, zMove);
  if (xMove !== 0) moveVector.addScaledVector(right, xMove);

  moveVector.normalize();

  const speed = PARAMS.speed;
  camera.position.addScaledVector(moveVector, speed * delta);
}
