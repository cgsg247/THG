import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

// Массив для синхронизации физики с графикой
const physicsPairs = [];
export { physicsPairs };

export function create3dBodies(scene, world) {
  // 1. Создаем физический пол
  // const floorSize = 100;
  // const floorThickness = 0.4;

  // const floorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
  //   0,
  //   -floorThickness / 2,
  //   0,
  // );
  // const floorBody = world.createRigidBody(floorBodyDesc);
  // const floorColliderDesc = RAPIER.ColliderDesc.cuboid(
  //   floorSize / 2,
  //   floorThickness / 2,
  //   floorSize / 2,
  // );
  // world.createCollider(floorColliderDesc, floorBody);

  // const floorGeo = new THREE.BoxGeometry(floorSize, floorThickness, floorSize);
  // const floorMat = new THREE.MeshStandardMaterial({
  //   color: 0x151515,
  //   roughness: 0.9,
  // });
  // const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  // floorMesh.position.y = -floorThickness / 2;
  // floorMesh.receiveShadow = true;
  // scene.add(floorMesh);

  // 2. Создаем физический куб
  const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    roughness: 0.5,
  });
  const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
  cubeMesh.castShadow = true;
  cubeMesh.receiveShadow = true;
  scene.add(cubeMesh);

  const cubeBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 3);
  const cubeBody = world.createRigidBody(cubeBodyDesc);
  const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
  world.createCollider(cubeColliderDesc, cubeBody);
  physicsPairs.push({ mesh: cubeMesh, body: cubeBody });

  // 2. Создаем физический шар
  const sphereRadius = 0.3;
  const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 0.5,
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  scene.add(sphereMesh);

  const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
    0,
    1,
    -1,
  );
  const sphereBody = world.createRigidBody(sphereBodyDesc);
  const sphereColliderDesc = RAPIER.ColliderDesc.ball(sphereRadius);
  world.createCollider(sphereColliderDesc, sphereBody);
  physicsPairs.push({ mesh: sphereMesh, body: sphereBody });
}

export function createPlayer(world) {
  // ===========================
  // СОЗДАЕМ ФИЗИЧЕСКОГО ИГРОКА
  // ===========================

  // Физическое тело игрока (Капсула, чтобы не застревать в углах)
  const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, 2, 0)
    .lockRotations();
  const playerBody = world.createRigidBody(playerBodyDesc);
  const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.5);
  world.createCollider(playerColliderDesc, playerBody);
  return playerBody;
}
