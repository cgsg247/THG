import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { loadModel, loadAnimModel, responseAnimModel } from "./model_load.js";
import { isGameActive, isPaused, menuInit } from "./menu.js";
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
import { initUI, addUIParts } from "./ui.js";
import { keyboardParser, keys } from "./keyboard.js";
import { controls, pointerLockControl } from "./pointer_lock.js";

RAPIER.init({}).then(() => {
  runGame(RAPIER);
});

function runGame(RAPIER) {
  // Инициализация счетчика статистики
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

  // Создание физического мира с гравитацией
  const g = -9.80665; // free-fall acceleration
  const gravity = { x: 0.0, y: g, z: 0.0 };
  const world = new RAPIER.World(gravity);

  // Создание сцены
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050505");

  // Инициализация камеры
  const camera = initCamera();

  // Рендерер и тени
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  // Загрузка модели окружения (Backrooms)
  loadModel(scene, "./assets/models/backrooms_vr18.glb", world);
  // Загрузка анимированной модели
  loadAnimModel(scene, "./assets/models/walking.glb");

  // Освещение (Dir + Ambient + FlashLight (фонарик))
  createFlashlight(scene, camera);
  createFlashlightUI();
  enableFlashlightUI();
  enableLight(scene);

  // Создаем физичсекие 3д тела (куб и сфера)
  create3dBodies(scene, world);

  // Создаем физического игрока
  const playerBody = createPlayer(world);

  // ===============================
  // Обработка событий Pointer Lock
  // ===============================

  pointerLockControl(camera);
  // Подключаем управление мышью от первого лица
  // const controls = new PointerLockControls(camera, document.body);

  // // Глобальный флаг для отслеживания состояния блокировки
  // let isPointerLocked = false;

  // // Обработчики событий Pointer Lock
  // controls.domElement.addEventListener("pointerlockchange", () => {
  //   if (!controls.isLocked) {
  //     setSpectatorActive(false);
  //     Object.keys(keys).forEach((k) => (keys[k] = false));
  //   }
  //   isPointerLocked = controls.isLocked;
  //   console.log("Pointer lock changed:", isPointerLocked);
  // });

  // controls.domElement.addEventListener("pointerlockerror", () => {
  //   console.log("Pointer lock failed, will retry on next click");
  // });

  // Инициализация меню
  menuInit(controls);

  // =============
  // НАСТРОЙКИ UI
  // =============

  // Инициализация UI TweakPane
  initUI(controls);

  // Параметры скорости игрока
  const PARAMS = {
    speed: 6,
    boost: 2,
  };

  // Параметры прыжка игрока
  const jumpParams = {
    force: 5.5,
    groundCheck: 1.2,
    playerHeight: 0.8,
  };

  // Добавление binding в UI TweakPane
  addUIParts(PARAMS, jumpParams);

  // Таймер
  const timer = new THREE.Timer();
  timer.connect(document);

  // Обработка клавиатуры
  keyboardParser(controls);

  // Векторы для расчета направления движения
  const moveDirection = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  let canJump = true;

  // Игровой цикл
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

    // Обновляем направление фонарика
    if (isGameActive && !isPaused) {
      updateFlashlightPosition(camera);
    }

    // Шаг физического мира
    world.step();

    // Синхронизируем физические тела с графикой
    physicsPairs.forEach((pair) => {
      const position = pair.body.translation();
      const rotation = pair.body.rotation();
      pair.mesh.position.set(position.x, position.y, position.z);
      pair.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });

    // Обновление анимированной модели
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

    renderer.render(scene, camera);

    stats.end();
  }

  // Изменение размеров окна
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}
