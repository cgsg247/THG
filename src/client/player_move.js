import { isGameActive, isPaused } from "./menu";
// import RAPIER from "@dimforge/rapier3d-compat";
// import { playerCollider } from "./physic_bodies.js";

// function isGrounded(RAPIER, world, playerBody, jumpParams) {
//   const pos = playerBody.translation();
//   const ray = new RAPIER.Ray(
//     { x: pos.x, y: pos.y, z: pos.z },
//     { x: 0, y: -1, z: 0 },
//   );
//   const hit = world.castRay(
//     ray,
//     jumpParams.groundCheck,
//     true,
//     (collider) => collider !== playerCollider,
//   );
//   return hit !== null;
// }

export let isWin = false;
export let gameStartTime = 0;
let winChecked = false;

export const winZone = {
  xMin: -50 - 0.7,
  xMax: -50 + 0.7,
  zMin: -4 - 0.7,
  zMax: -4 + 0.7,
};
export const winTime = 90;

export function setGameStartTime() {
  gameStartTime = performance.now() / 1000;
  winChecked = false;
}

export function resetWinState() {
  isWin = false;
  winChecked = false;
  gameStartTime = 0;
}

export function MovePlayer(
  world,
  playerBody,
  jumpParams,
  camera,
  PARAMS,
  moveDirection,
  frontVector,
  sideVector,
  controls,
  keys,
  canJump,
) {
  if (!isGameActive) return;

  if (controls.isLocked) {
    //const grounded = isGrounded(RAPIER, world, playerBody, jumpParams);
    // if (keys.space && grounded && canJump) {
    //   const vel = playerBody.linvel();
    //   playerBody.setLinvel({ x: vel.x, y: jumpParams.force, z: vel.z }, true);
    //   console.log("Прыжок");
    //   canJump = false;
    // }
    //if (grounded && !keys.space && !canJump) canJump = true;

    frontVector.set(0, 0, Number(keys.w) - Number(keys.s));
    sideVector.set(0, 0, Number(keys.d) - Number(keys.a));

    camera.getWorldDirection(moveDirection);
    moveDirection.y = 0;
    moveDirection.normalize();

    let current_speed;
    const speed_boost = 1.35;

    if (keys.shift) {
      current_speed = PARAMS.speed * speed_boost;
    } else {
      current_speed = PARAMS.speed;
    }

    const targetVelocityX =
      (moveDirection.x * frontVector.z +
        camera.up.clone().cross(moveDirection).negate().x * sideVector.z) *
      current_speed;
    const targetVelocityZ =
      (moveDirection.z * frontVector.z +
        camera.up.clone().cross(moveDirection).negate().z * sideVector.z) *
      current_speed;

    const currentYVelocity = playerBody.linvel().y;

    playerBody.setLinvel(
      { x: targetVelocityX, y: currentYVelocity, z: targetVelocityZ },
      true,
    );
  }

  const playerPos = playerBody.translation();
  camera.position.set(
    playerPos.x,
    playerPos.y + jumpParams.playerHeight,
    playerPos.z,
  );

  if (isGameActive && !isPaused && !isWin && !winChecked) {
    const currentTime = performance.now() / 1000;
    const diff = currentTime - gameStartTime;

    const inZone =
      playerPos.x >= winZone.xMin &&
      playerPos.x <= winZone.xMax &&
      playerPos.z >= winZone.zMin &&
      playerPos.z <= winZone.zMax;

    if (inZone && diff >= winTime) {
      isWin = true;
      winChecked = true;
    }
  }
  return canJump;
}
