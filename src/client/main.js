import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  responseAnimModel,
  enemyAnimModel,
  updateEnemyPhysics,
} from "./model_load.js";
import {
  isGameActive,
  isPaused,
  menuInit,
  gameMenu,
  setIsGameActive,
  setIsPaused,
} from "./menu.js";
import { MovePlayer } from "./player_move.js";
import {
  createFlashlight,
  createFlashlightUI,
  enableFlashlightUI,
  updateFlashlightPosition,
} from "./flashlight.js";
import { enableLight } from "./light.js";
import { createPlayer, physicsPairs } from "./physic_bodies.js";
import { initCamera, updateSpectatorCamera } from "./camera.js";
import { PARAMS, jumpParams, initUI, addUIParts } from "./ui.js";
import { keyboardParser, keys } from "./keyboard.js";
import { controls, pointerLockControl } from "./pointer_lock.js";
import { startGameLoading } from "./loading.js";
import { showStory, startVideo } from "./story.js";
import { Enemy } from "./enemy.js";
import * as YUKA from "yuka";
import {
  initListener,
  startAudio,
  startBackgroundAudio,
  stopAudio,
  stopBackgroundAudio,
} from "./audio.js";
import { checkGameOver, isGameOver, resetGameOver } from "./end.js";
import Stats from "stats.js";

RAPIER.init({}).then(() => {
  runGame(RAPIER);
});

function runGame(RAPIER) {
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  document.body.appendChild(renderer.domElement);

  // Lighting (Dir + Ambient + FlashLight)
  createFlashlight(scene, camera);
  createFlashlightUI();
  enableFlashlightUI();
  enableLight(scene);

  // Create physical player
  const playerBody = createPlayer(world);

  // Initialization listener
  initListener(camera);

  // Handling Pointer Lock Events
  pointerLockControl(camera);

  gameMenu.onStart(async () => {
    stopBackgroundAudio();
    resetGameOver();
    gameMenu.hideMain();
    const gameOverScreen = document.getElementById("game-over-screen");
    if (gameOverScreen) gameOverScreen.style.display = "none";
    document.getElementById("main-menu").style.display = "none";

    showStory(() => {
      startVideo(async () => {
        try {
          await startGameLoading(scene, world, camera);
          startAudio();
        } catch (error) {
          console.error("Error: ", error);
        }
      });
    });
  });

  // Menu initialization
  menuInit(playerBody, controls, scene, camera);
  // Lose menu button
  document.getElementById("lose-menu-btn")?.addEventListener("click", () => {
    resetGameOver();
    setIsGameActive(false);
    setIsPaused(false);
    if (controls.isLocked) controls.unlock();
    gameMenu.showMain(scene);
  });

  // Timer
  const timer = new THREE.Timer();
  timer.connect(document);

  // Keyboard parsing
  keyboardParser(controls);

  // Vectors for calculating the direction of movement
  const moveDirection = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  initUI(controls);
  addUIParts();

  // Can jump flag
  let canJump = true;

  const entityManager = new YUKA.EntityManager();
  let enemy = null;

  // Game loop
  function animate() {
    requestAnimationFrame(animate);

    timer.update();
    const delta = timer.getDelta();

    if (isGameOver()) {
      renderer.render(scene, camera);
      return;
    }

    // if (isGameActive && !isPaused) {
    // } else {
    //   renderer.render(scene, camera);
    //   return;
    // }
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

    if (enemyAnimModel && !enemy) {
      enemy = new Enemy(enemyAnimModel, world, 3.5);
      entityManager.add(enemy);
    }

    if (enemy) {
      enemy.updateTargetPosition(camera.position);
      entityManager.update(delta);
      enemy.syncPhysicsAndGraphics(camera.position);
    }

    if (checkGameOver(controls)) {
      renderer.render(scene, camera);
      return;
    }

    // Update animated model
    responseAnimModel(delta);

    // Update enemy physics
    updateEnemyPhysics();

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
