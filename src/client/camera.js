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

export function responseCamera(
  camera,
  controls,
  delta,
  moveDirection,
  keys,
  velocity,
) {
  if (!isSpectatorActive || !controls.isLocked) return;

  const FRICTION = 0.92;
  const ACCELERATION = 50;
  // 1. Применяем инерционное торможение
  velocity.x *= FRICTION;
  velocity.y *= FRICTION;
  velocity.z *= FRICTION;

  // 2. Рассчитываем вектор направления из нажатых клавиш
  moveDirection.z = Number(keys.w) - Number(keys.s);
  moveDirection.x = Number(keys.d) - Number(keys.a);
  moveDirection.y = Number(keys.space) - Number(keys.shift);
  if (moveDirection.length() > 0) moveDirection.normalize();

  // 3. Разгон вперед/назад с учетом направления взгляда камеры
  if (keys.w || keys.s) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    velocity.addScaledVector(forward, moveDirection.z * ACCELERATION * delta);
  }

  // 4. Разгон влево/вправо с учетом направления взгляда камеры
  if (keys.a || keys.d) {
    const right = new THREE.Vector3();
    right
      .crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()))
      .negate();
    velocity.addScaledVector(right, moveDirection.x * ACCELERATION * delta);
  }

  // 5. Разгон строго по вертикали вверх/вниз
  if (keys.space || keys.shift) {
    velocity.y += moveDirection.y * ACCELERATION * delta;
  }

  // 6. Ограничение максимальной скорости полета
  velocity.clampLength(0, 15);

  // 7. Смещение позиции камеры
  camera.position.addScaledVector(velocity, delta);
}
