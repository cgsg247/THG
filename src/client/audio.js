// import * as THREE from "three";

// let sound = null;
// let soundPoint = null;
// let listener = null;

// export function initAudio(scene, camera, onProgress) {
//   return new Promise((resolve, reject) => {
//     listener = new THREE.AudioListener();
//     camera.add(listener);

//     soundPoint = new THREE.Object3D();
//     soundPoint.position.set(0, 0, 0);
//     scene.add(soundPoint);

//     sound = new THREE.PositionalAudio(listener);
//     sound.setVolume(1);
//     sound.setRefDistance(20);
//     sound.setMaxDistance(50);
//     sound.setRolloffFactor(1);

//     soundPoint.add(sound);

//     const audioLoader = new THREE.AudioLoader();
//     const audioPath = "./assets/sounds/backrooms.mp3";
//     console.log(`sound: ${audioPath} loaded`);

//     audioLoader.load(
//       "./assets/sounds/backrooms.mp3",
//       (buffer) => {
//         sound.setBuffer(buffer);
//         sound.play();
//         resolve();
//       },
//       (progress) => {
//         const percent = (progress.loaded / progress.total) * 100;
//         if (onProgress) onProgress(percent, "Sound");
//       },
//       (error) => {
//         reject(error);
//       },
//     );
//     document.addEventListener("click", activateAudio);
//     document.addEventListener("keydown", activateAudio);
//   });
// }

// function activateAudio() {
//   if (!sound || !sound.context) {
//     return;
//   }

//   if (sound.context.state === "suspended") {
//     sound.context
//       .resume()
//       .then(() => {
//         if (sound.buffer && !sound.isPlaying) sound.play();
//       })
//       .catch((err) => {
//         console.error("Activation error:", err);
//       });
//   } else if (sound.context.state === "running") {
//     if (sound.buffer && !sound.isPlaying) {
//       sound.play();
//     }
//   }
// }
import * as THREE from "three";

let sound = null;
let soundPoint = null;
let listener = null;
let isAudioInitialized = false;

export function initAudio(scene, camera, onProgress) {
  return new Promise((resolve, reject) => {
    if (listener) camera.remove(listener);
    if (soundPoint) scene.remove(soundPoint);

    listener = new THREE.AudioListener();
    camera.add(listener);

    soundPoint = new THREE.Object3D();
    soundPoint.position.set(0, 0, 0);
    scene.add(soundPoint);

    sound = new THREE.PositionalAudio(listener);
    sound.setVolume(1);
    sound.setRefDistance(20);
    sound.setMaxDistance(50);
    sound.setRolloffFactor(1);

    soundPoint.add(sound);

    const audioLoader = new THREE.AudioLoader();
    const audioPath = "./assets/sounds/backrooms.mp3";

    audioLoader.load(
      audioPath,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.play();
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
