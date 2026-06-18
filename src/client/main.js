import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { responseAnimModel, enemyAnimModel } from "./model_load.js";
import { isGameActive, isPaused, menuInit, gameMenu } from "./menu.js";
import { MovePlayer } from "./player_move.js";
import Stats from "stats.js";
import {
  createFlashlight,
  createFlashlightUI,
  enableFlashlightUI,
  updateFlashlightPosition,
} from "./flashlight.js";
import { enableLight } from "./light.js";
import { createPlayer, create3dBodies, physicsPairs } from "./physic_bodies.js";
import { initCamera, updateSpectatorCamera } from "./camera.js";
import { initUI, addUIParts, PARAMS, jumpParams, ENEMY_PARAMS } from "./ui.js";
import { keyboardParser, keys } from "./keyboard.js";
import { controls, pointerLockControl } from "./pointer_lock.js";
import { startGameLoading } from "./loading.js";
import { Enemy, initGrid } from "./enemy.js";

RAPIER.init({}).then(() => {
  runGame(RAPIER);
});

function runGame(RAPIER) {
  // Initializing statistics counter
  const stats = new Stats();
  Array.from(stats.dom.children).forEach((canvas) => {
    canvas.style.display = "block";
    canvas.style.float = "left";
    canvas.style.marginRight = "5px";
  });

  stats.dom.style.top = "10px";
  stats.dom.style.left = "10px";
  stats.dom.style.width = "auto";

  document.body.appendChild(stats.dom);

  // Creating a physical world with gravity
  const g = -9.80665; // free-fall acceleration
  const gravity = { x: 0.0, y: g, z: 0.0 };
  const world = new RAPIER.World(gravity);

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050505");

  // Camera initialization
  const camera = initCamera();

  // Renderer and shadows
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  //renderer.shadowMap.enabled = true;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting (Dir + Ambient + FlashLight)
  createFlashlight(scene, camera);
  createFlashlightUI();
  enableFlashlightUI();
  enableLight(scene);

  // Creating physical 3D bodies (cube and sphere)
  // create3dBodies(scene, world);

  // Create physical player
  const playerBody = createPlayer(world);

  // Handling Pointer Lock Events
  pointerLockControl(camera);

  let enemy = null;

  gameMenu.onStart(async () => {
    gameMenu.hideMain();
    document.getElementById("main-menu").style.display = "none";

    try {
      controls.lock();
    } catch (error) {
      console.error("PointerLock Error:", error);
    }

    try {
      await startGameLoading(scene, world, camera);
      console.log("Все ресурсы успешно загружены. Инициализируем ИИ врага...");
      const gridData = initGrid(scene, world, 0.5, 0.5);
      if (enemyAnimModel) {
        const startPos = new THREE.Vector3(5, camera.position.y - 0.5, 5);

        enemy = new Enemy(
          enemyAnimModel,
          gridData,
          startPos,
          ENEMY_PARAMS.speed,
        );
        console.log("Враг заспавнен на высоте:", startPos.y);
      } else {
        console.error(
          "Критическая ошибка: enemyAnimModel равен null после загрузки.",
        );
      }
    } catch (error) {
      console.error("Ошибка при старте игры или генерации сетки:", error);
    }
  });

  // Menu initialization
  menuInit(playerBody, controls);

  // =============
  // UI SETTINGS
  // =============

  // Initialization UI TweakPane
  initUI(controls);

  // Adding a binding to UI TweakPane
  addUIParts();

  // Timer
  const timer = new THREE.Timer();
  timer.connect(document);

  // Keyboard parsing
  keyboardParser(controls);

  // Vectors for calculating the direction of movement
  const moveDirection = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  // Can jump flag
  let canJump = true;

  // Game loop
  function animate() {
    requestAnimationFrame(animate);

    timer.update();
    const delta = timer.getDelta();

    if (isGameActive && !isPaused) {
      stats.dom.style.display = "block";
      stats.begin();
    } else {
      stats.dom.style.display = "none";
      renderer.render(scene, camera);
      return;
    }

    // Update the flashlight direction
    if (isGameActive && !isPaused) {
      updateFlashlightPosition(camera);
    }

    // Step of physical world
    world.step();

    // Synchronize physical bodies with graphics
    physicsPairs.forEach((pair) => {
      const position = pair.body.translation();
      const rotation = pair.body.rotation();
      pair.mesh.position.set(position.x, position.y, position.z);
      pair.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });

    // Update animated model
    responseAnimModel(delta);

    if (!keys.f2) {
      MovePlayer(
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
      );
    } else {
      if (controls.isLocked) {
        updateSpectatorCamera(camera, controls, delta, keys, PARAMS);
      }
    }

    if (enemy) {
      enemy.update(delta, camera.position);
      enemy.setSpeed(ENEMY_PARAMS.speed);
    }

    renderer.render(scene, camera);

    stats.end();
  }

  // Resizing window
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}
