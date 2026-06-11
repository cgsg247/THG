import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { Pane } from "tweakpane";
import { loadBackrooms } from "./model_load.js";
import { GameMenu } from "./menu.js";
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

RAPIER.init({}).then(() => {
  runGame(RAPIER);
});

function runGame(RAPIER) {
  // Инициализация счетчика
  const stats = new Stats();
  Array.from(stats.dom.children).forEach((canvas) => {
    canvas.style.display = "block";
    canvas.style.float = "left";
    canvas.style.marginRight = "5px";
  });

  stats.dom.style.position = "absolute";
  stats.dom.style.top = "10px";
  stats.dom.style.left = "10px";
  stats.dom.style.zIndex = "1000";
  stats.dom.style.width = "auto";

  document.body.appendChild(stats.dom);

  // 1. Физический мир
  const g = -9.80665; // free-fall acceleration
  const gravity = { x: 0.0, y: g, z: 0.0 };
  const world = new RAPIER.World(gravity);

  // 2. Сцена и камера
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050505");

  // Создание перспективной камеры
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );

  // 3. Рендерер и тени
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  // Загрузка модели окружения (Backrooms)
  loadBackrooms(scene, "./assets/models/dreamcore_liminal_space.glb");

  createFlashlight(scene, camera);
  createFlashlightUI();
  enableFlashlightUI();
  enableLight(scene);

  // Создаем физичсекие 3д тела (куб и сфера)
  create3dBodies(scene, world);
  // Создаем физического игрока
  const playerBody = createPlayer(world);

  // Подключаем управление мышью от первого лица
  const controls = new PointerLockControls(camera, document.body);

  // ==========================================
  // ИНИЦИАЛИЗАЦИЯ МЕНЮ
  // ==========================================
  const gameMenu = new GameMenu();
  let isGameActive = false,
    isPaused = false;

  gameMenu.onStart(() => {
    gameMenu.hideMain();
    isGameActive = true;
    isPaused = false;
  });

  gameMenu.onResume(() => {
    gameMenu.hidePause();
    isPaused = false;
    isGameActive = true;
  });

  gameMenu.onExit(() => {
    gameMenu.showMain();
    isGameActive = isPaused = false;
    if (controls.isLocked) controls.unlock();
    gameMenu.reset(playerBody, controls);
  });

  gameMenu.onEscape(
    () => {
      if (isGameActive && !isPaused) {
        gameMenu.showPause();
        isPaused = true;
        isGameActive = false;
        if (controls.isLocked) controls.unlock();
      }
    },
    () => {
      gameMenu.hidePause();
      isPaused = false;
      isGameActive = true;
    },
  );

  gameMenu.showMain();

  // ==========================================
  // НАСТРОЙКИ UI
  // ==========================================
  const pane = new Pane({
    title: "Geometry control",
    container: document.getElementById("panel"),
  });

  // Блокируем всплытие событий на панели
  const panelDiv = document.getElementById("panel");
  if (panelDiv) {
    panelDiv.addEventListener("mousedown", (e) => e.stopPropagation());
    panelDiv.addEventListener("mouseup", (e) => e.stopPropagation());
  }

  // Обработчик для UI панели
  pane.on("change", () => {
    if (controls && controls.isLocked) {
      controls.unlock();
    }
  });

  // ==========================================
  // Обработка событий Pointer Lock
  // ==========================================

  // Глобальный флаг для отслеживания состояния блокировки
  let isPointerLocked = false;

  // Обработчики событий Pointer Lock
  controls.domElement.addEventListener("pointerlockchange", () => {
    isPointerLocked = controls.isLocked;
    console.log("Pointer lock changed:", isPointerLocked);
  });

  controls.domElement.addEventListener("pointerlockerror", () => {
    console.log("Pointer lock failed, will retry on next click");
  });

  window.addEventListener("click", () => {
    if (isGameActive && !isPaused && !controls.isLocked) {
      setTimeout(() => {
        try {
          controls.lock();
        } catch (error) {
          console.warn("Failed to lock:", error);
        }
      }, 50);
    }
  });

  // Обработка клавиатуры
  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false,
  };
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const code = e.code;

    if (!isGameActive || isPaused) return;

    if (key === "w" || key === "ц" || code === "KeyW") keys.w = true;
    if (key === "a" || key === "ф" || code === "KeyA") keys.a = true;
    if (key === "s" || key === "ы" || code === "KeyS") keys.s = true;
    if (key === "d" || key === "в" || code === "KeyD") keys.d = true;

    if (e.code === "Space") {
      keys.space = true;
      e.preventDefault();
    }
    if (e.code === "Shift") {
      keys.shift = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    const code = e.code;

    if (!isGameActive || isPaused) return;

    if (key === "w" || key === "ц" || code === "KeyW") keys.w = false;
    if (key === "a" || key === "ф" || code === "KeyA") keys.a = false;
    if (key === "s" || key === "ы" || code === "KeyS") keys.s = false;
    if (key === "d" || key === "в" || code === "KeyD") keys.d = false;

    if (e.code === "Space") {
      keys.space = false;
      e.preventDefault();
    }
    if (e.code === "Shift") {
      keys.shift = false;
      e.preventDefault();
    }
  });
  window.addEventListener("blur", () => {
    if (isGameActive && !isPaused && controls.isLocked) {
      gameMenu.showPause();
      isPaused = true;
      isGameActive = false;
      if (controls.isLocked) controls.unlock();
    }
  });
  // Векторы для расчета направления движения
  const moveDirection = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  // Параметры скорости игрока
  const PARAMS = {
    speed: 6,
    boost: 2,
  };

  pane.addBinding(PARAMS, "speed", {
    min: 0.1,
    max: 20,
    step: 0.05,
  });

  // Параметры прыжка игрока
  const jumpParams = {
    force: 5.5,
    groundCheck: 1.2,
  };

  pane.addBinding(jumpParams, "force", { min: 3, max: 10, step: 0.1 });
  pane.addBinding(jumpParams, "groundCheck", {
    min: 0.5,
    max: 1.2,
    step: 0.05,
  });

  let canJump = true;

  // 8. Игровой цикл
  function animate() {
    requestAnimationFrame(animate);
    stats.begin();

    if (!isGameActive || isPaused) {
      renderer.render(scene, camera);
      return;
    }

    // Обновляем направление фонарика
    if (isGameActive && !isPaused) {
      updateFlashlightPosition(camera);
    }

    // Шаг физического мира
    world.step();

    // Синхронизируем физические тела (наш зеленый куб) с графикой
    physicsPairs.forEach((pair) => {
      const position = pair.body.translation();
      const rotation = pair.body.rotation();
      pair.mesh.position.set(position.x, position.y, position.z);
      pair.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });

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
      RAPIER,
      canJump,
    );
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
