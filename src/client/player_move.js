function isGrounded(RAPIER, world, playerBody, jumpParams) {
  const pos = playerBody.translation();
  const ray = new RAPIER.Ray(
    { x: pos.x, y: pos.y - 0.55, z: pos.z },
    { x: 0, y: -1, z: 0 },
  );
  const hit = world.castRay(ray, jumpParams.groundCheck, true);
  return hit !== null;
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
  RAPIER,
  canJump,
) {
  // ЛОГИКА ДВИЖЕНИЯ ИГРОКА (Только если курсор мыши захвачен игрой)
  if (controls.isLocked) {
    // ПРЫЖОК
    const grounded = isGrounded(RAPIER, world, playerBody, jumpParams);
    if (keys.space && grounded && canJump) {
      const vel = playerBody.linvel();
      playerBody.setLinvel({ x: vel.x, y: jumpParams.force, z: vel.z }, true);
      console.log("Прыжок");
      canJump = false;
    }
    if (grounded && !keys.space && !canJump) canJump = true; // защита от повторного прыжка

    frontVector.set(0, 0, Number(keys.w) - Number(keys.s));
    sideVector.set(0, 0, Number(keys.d) - Number(keys.a));

    camera.getWorldDirection(moveDirection);
    moveDirection.y = 0;
    moveDirection.normalize();

    let current_speed;
    // Ускорение по shift
    if (keys.shift) current_speed = PARAMS.speed * PARAMS.boost;
    else current_speed = PARAMS.speed;

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
  camera.position.set(playerPos.x, playerPos.y + 0.8, playerPos.z);
  return canJump;
}
