import { loadModel, loadAnimModel } from "./model_load.js";
import { setIsGameActive, setIsPaused } from "./menu.js";
import { initAudio } from "./audio.js";

export class LoadingManager {
  constructor() {
    this.screen = document.getElementById("loading-screen");
    this.progressBar = document.getElementById("progress-bar");
    this.progressText = document.getElementById("progress-text");
    this.statusText = document.getElementById("status-text");

    this.tasks = [];
    this.taskProgress = [];
    this.totalProgress = 0;
    this.isComplete = false;
  }

  addTask(taskFn, name = "") {
    this.tasks.push({ fn: taskFn, name });
    this.taskProgress.push(0);
  }

  async start() {
    this.screen.style.display = "flex";
    this.screen.style.opacity = "1";
    this.updateProgress(0, "Инициализация...");

    const total = this.tasks.length;
    if (total === 0) {
      this.complete();
      return;
    }

    const promises = this.tasks.map((task, index) => {
      return task.fn((percent, status) => {
        this.taskProgress[index] = percent;
        const sum = this.taskProgress.reduce((a, b) => a + b, 0);
        const avg = sum / total;
        this.updateProgress(avg, status || `Загрузка: ${task.name}`);
      });
    });

    await Promise.all(promises);

    this.complete();
  }

  updateProgress(percent, status) {
    const clamped = Math.min(percent, 100);
    this.progressBar.style.width = clamped + "%";
    this.progressText.textContent = Math.round(clamped) + "%";
    if (status) this.statusText.textContent = status;
    this.totalProgress = clamped;
  }

  complete() {
    this.updateProgress(100, "Ready!");
    this.isComplete = true;
    setTimeout(() => {
      this.hide();
    }, 500);
  }

  hide() {
    this.screen.style.opacity = "0";
    setTimeout(() => {
      this.screen.style.display = "none";
    }, 800);
  }

  reset() {
    this.tasks = [];
    this.taskProgress = [];
    this.totalProgress = 0;
    this.isComplete = false;
    this.progressBar.style.width = "0%";
    this.progressText.textContent = "0%";
    this.statusText.textContent = "Подготовка...";
    this.screen.style.display = "none";
  }
}

export const loadingManager = new LoadingManager();

export async function startGameLoading(scene, world, camera) {
  loadingManager.reset();

  loadingManager.addTask(
    (onProgress) =>
      loadModel(
        scene,
        "./assets/models/backrooms_vr18_compressed.glb",
        world,
        { x: 0, y: 0, z: 0 },
        onProgress,
      ),
    "Enviroment",
  );
  // loadingManager.addTask(
  //   (onProgress) => initAudio(scene, camera, onProgress),
  //   "Sound",
  // );
  loadingManager.addTask(
    (onProgress) =>
      loadAnimModel(scene, "./assets/models/bacteria.glb", onProgress, true),
    "Animation",
  );

  await loadingManager.start();

  setIsGameActive(true);
  setIsPaused(false);
}
