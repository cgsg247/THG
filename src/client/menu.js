import {
  startBackgroundAudio,
  stopAudio,
  initBackgroundAudio,
} from "./audio.js";

import { resetGameOver } from "./end.js";

class GameMenu {
  constructor() {
    this.main = document.getElementById("main-menu");
    this.pause = document.getElementById("pause-menu");
    this.start = document.getElementById("start-btn");
    this.resume = document.getElementById("resume-btn");
    this.menu = document.getElementById("menu-btn");
    if (this.pause) this.pause.style.display = "none";
    this.active = this.paused = false;
  }

  showMain(scene) {
    if (this.main) this.main.style.display = "flex";
    if (this.pause) this.pause.style.display = "none";
    this.active = this.paused = false;
    stopAudio();
    startBackgroundAudio();
    resetGameOver();

    if (scene) {
      scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();

          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      scene.clear();
    }
  }
  hideMain() {
    if (this.main) this.main.style.display = "none";
    this.active = true;
    this.paused = false;
  }
  showPause() {
    if (this.active && !this.paused && this.pause) {
      this.pause.style.display = "flex";
      this.paused = true;
    }
  }
  hidePause() {
    if (this.pause) this.pause.style.display = "none";
    this.paused = false;
  }

  onStart(cb) {
    if (this.start) this.start.onclick = cb;
  }
  onResume(cb) {
    if (this.resume) this.resume.onclick = cb;
  }
  onExit(cb) {
    if (this.menu) this.menu.onclick = cb;
  }

  onEscape(onP, onR) {
    document.onkeydown = (e) => {
      if (e.code === "Escape" && this.active) this.paused ? onR() : onP();
    };
  }

  reset(player, controls) {
    if (player) {
      player.setTranslation({ x: 0, y: 0, z: 0 }, true);
      player.setLinvel({ x: 0, y: 2, z: 0 }, true);
    }
    if (controls && controls.isLocked) controls.unlock();
  }
}

export const gameMenu = new GameMenu();
export let isGameActive = false;
export let isPaused = false;

export function setIsGameActive(value) {
  isGameActive = value;
}

export function setIsPaused(value) {
  isPaused = value;
}

export function menuInit(playerBody, controls, scene, camera) {
  gameMenu.onResume(() => {
    gameMenu.hidePause();
    isPaused = false;
    isGameActive = true;
  });

  gameMenu.onExit(() => {
    stopAudio();
    gameMenu.showMain(scene);
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
        controls.unlock();
      }
    },
    () => {
      gameMenu.hidePause();
      isPaused = false;
      isGameActive = true;
    },
  );

  gameMenu.showMain(scene);
  initBackgroundAudio(scene, camera, "./assets/sounds/backrooms.mp3");
}
