import * as THREE from "three";

export let sound = null;
export let backgroundSound = null;
let soundPoint = null;
export let listener = null;
let isAudioInitialized = false;
let isBackgroundAudioInitialized = false;

export function initListener(camera) {
  listener = new THREE.AudioListener();
  camera.add(listener);
}

export function initAudio(scene, camera, audioPath, onProgress) {
  return new Promise((resolve, reject) => {
    if (listener) camera.remove(listener);
    if (soundPoint) scene.remove(soundPoint);

    soundPoint = new THREE.Object3D();
    soundPoint.position.set(0, 0, 0);
    scene.add(soundPoint);

    sound = new THREE.PositionalAudio(listener);
    sound.setVolume(1);

    soundPoint.add(sound);

    const audioLoader = new THREE.AudioLoader();

    audioLoader.load(
      audioPath,
      (buffer) => {
        sound.setBuffer(buffer);
        console.log(`sound: ${audioPath} loaded`);
        resolve();
      },
      (progress) => {
        const percent =
          progress.total && progress.total > 0
            ? (progress.loaded / progress.total) * 100
            : 100;
        if (onProgress) onProgress(percent, "Sound");
      },
      (error) => {
        console.error("Audio error:", error);
        reject(error);
      },
    );

    if (!isAudioInitialized) {
      document.addEventListener("click", activateAudio);
      document.addEventListener("keydown", activateAudio);
      isAudioInitialized = true;
    }
  });
}

export function initBackgroundAudio(scene, camera, audioPath, onProgress) {
  return new Promise((resolve, reject) => {
    if (listener) camera.remove(listener);
    if (soundPoint) scene.remove(soundPoint);

    //listener = new THREE.AudioListener();
    //camera.add(listener);

    backgroundSound = new THREE.Audio(listener);

    const audioLoader = new THREE.AudioLoader();

    audioLoader.load(
      audioPath,
      (buffer) => {
        backgroundSound.setBuffer(buffer);
        backgroundSound.setVolume(0.5);
        console.log(`background sound: ${audioPath} loaded`);
        resolve();
      },
      (progress) => {
        const percent =
          progress.total && progress.total > 0
            ? (progress.loaded / progress.total) * 100
            : 100;
        if (onProgress) onProgress(percent, "Sound");
      },
      (error) => {
        console.error("Background audio error:", error);
        reject(error);
      },
    );

    if (!isBackgroundAudioInitialized) {
      document.addEventListener("click", activateAudio);
      document.addEventListener("keydown", activateAudio);
      isBackgroundAudioInitialized = true;
    }
  });
}

function activateAudio() {
  if (!sound || !sound.context) return;

  if (sound.context.state === "suspended") {
    sound.context.resume().then(() => {
      if (sound.buffer && !sound.isPlaying) sound.play();
    });
  } else if (sound.context.state === "running") {
    if (sound.buffer && !sound.isPlaying) sound.play();
  }
}

export function startAudio() {
  if (sound) sound.play();
}

export function startBackgroundAudio() {
  if (backgroundSound) backgroundSound.play();
}

export function stopAudio() {
  if (sound) sound.stop();
}

export function stopBackgroundAudio() {
  if (backgroundSound) backgroundSound.stop();
}
