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

export function updateSpectatorCamera(camera, controls, delta, keys, PARAMS) {
  if (!isSpectatorActive || !controls.isLocked) return;

  const moveDirection = new THREE.Vector3();
  moveDirection.z = Number(keys.w) - Number(keys.s);
  moveDirection.x = Number(keys.a) - Number(keys.d);

  if (moveDirection.length() > 0) {
    moveDirection.normalize();
  }

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(camera.up, forward).normalize();

  const moveVector = new THREE.Vector3();
  moveVector.addScaledVector(forward, moveDirection.z);
  moveVector.addScaledVector(right, moveDirection.x);

  let speed = PARAMS.speed;

  camera.position.addScaledVector(moveVector, speed * delta);
}
