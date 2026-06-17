import * as THREE from "three";

let sound = null;
let soundPoint = null;
let listener = null;

export function initAudio(scene, camera, onProgress) {
  return new Promise((resolve, reject) => {
    listener = new THREE.AudioListener();
    camera.add(listener);
    console.log("🎧 Слушатель создан");

    soundPoint = new THREE.Object3D();
    soundPoint.position.set(0, 0, 0);
    scene.add(soundPoint);
    console.log("📌 Источник звука создан в точке:", soundPoint.position);

    sound = new THREE.PositionalAudio(listener);
    sound.setVolume(1);
    sound.setRefDistance(20);
    sound.setMaxDistance(50);
    sound.setRolloffFactor(1);

    soundPoint.add(sound);
    console.log("🔊 Объект звука создан");

    const audioLoader = new THREE.AudioLoader();
    const audioPath = "./assets/sounds/backrooms.mp3";
    console.log(`📁 Загрузка аудио: ${audioPath}`);

    audioLoader.load(
      "./assets/sounds/backrooms.mp3",
      (buffer) => {
        console.log("✅ Аудио загружено, размер:", buffer.length);
        sound.setBuffer(buffer);
        sound.play();
        console.log("▶️ Попытка воспроизведения");
        resolve();
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        if (onProgress) onProgress(percent, "Аудио");
      },
      (error) => {
        reject(error);
        console.error("❌ ОШИБКА загрузки аудио:", error);
      },
    );
    document.addEventListener("click", activateAudio);
    document.addEventListener("keydown", activateAudio);
  });
}

function activateAudio() {
  if (!sound || !sound.context) {
    console.warn("❌ Нет аудио контекста");
    return;
  }

  if (sound.context.state === "suspended") {
    sound.context
      .resume()
      .then(() => {
        console.log("✅ Аудио контекст активирован");

        if (sound.buffer && !sound.isPlaying) {
          sound.play();
          console.log("▶️ Звук запущен после активации");
        }
      })
      .catch((err) => {
        console.error("❌ Ошибка активации:", err);
      });
  } else if (sound.context.state === "running") {
    if (sound.buffer && !sound.isPlaying) {
      sound.play();
      console.log("▶️ Звук запущен");
    }
  }
}
