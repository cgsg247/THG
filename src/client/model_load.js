// import * as THREE from "three";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
// import RAPIER from "@dimforge/rapier3d-compat";

// export let mixer;

// THREE.Cache.enabled = true;

// const dracoLoader = new DRACOLoader();
// dracoLoader.setDecoderPath(
//   "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
// );
// dracoLoader.setDecoderConfig({ type: "wasm" });

// async function getCachedUrl(url) {
//   const cacheName = "threejs-assets-cache";

//   try {
//     const cache = await caches.open(cacheName);
//     const cachedResponse = await cache.match(url);

//     if (cachedResponse) {
//       const blob = await cachedResponse.blob();
//       return URL.createObjectURL(blob);
//     }

//     const response = await fetch(url);

//     await cache.put(url, response.clone());

//     const blob = await response.blob();
//     return URL.createObjectURL(blob);
//   } catch (error) {
//     console.warn("Кэширование недоступно, загружаем напрямую:", error);
//     return url;
//   }
// }

// export async function loadModel(scene, path, world, translate, onProgress) {
//   const localPath = await getCachedUrl(path);

//   return new Promise((resolve, reject) => {
//     const loader = new GLTFLoader();
//     loader.setDRACOLoader(dracoLoader);

//     loader.load(
//       localPath,
//       (gltf) => {
//         const model = gltf.scene;
//         scene.add(model);

//         model.traverse((child) => {
//           if (child.isMesh) {
//             child.geometry.computeVertexNormals();
//             child.castShadow = true;
//             child.receiveShadow = true;

//             const geometry = child.geometry;
//             if (!geometry.attributes.position) return;

//             let vertices = geometry.attributes.position.array;
//             let indices = geometry.index ? geometry.index.array : null;

//             const pos = child.getWorldPosition(new THREE.Vector3());
//             const rot = child.getWorldQuaternion(new THREE.Quaternion());
//             const scale = child.getWorldScale(new THREE.Vector3());

//             const scaledVertices = new Float32Array(vertices.length);
//             for (let i = 0; i < vertices.length; i += 3) {
//               scaledVertices[i] = vertices[i] * scale.x;
//               scaledVertices[i + 1] = vertices[i + 1] * scale.y;
//               scaledVertices[i + 2] = vertices[i + 2] * scale.z;
//             }

//             const meshBodyDesc = RAPIER.RigidBodyDesc.fixed()
//               .setTranslation(
//                 pos.x + translate.x,
//                 pos.y + translate.y,
//                 pos.z + translate.z,
//               )
//               .setRotation(rot);
//             const meshBody = world.createRigidBody(meshBodyDesc);
//             const colliderDesc = RAPIER.ColliderDesc.trimesh(
//               scaledVertices,
//               indices,
//             );
//             world.createCollider(colliderDesc, meshBody);
//           }
//         });
//         console.log(`model: ${path} loaded`);
//         resolve();
//       },
//       (progress) => {
//         const percent =
//           progress.total && progress.total > 0
//             ? (progress.loaded / progress.total) * 100
//             : 100;

//         if (onProgress) onProgress(percent, `model: ${path}`);
//       },
//       (error) => {
//         reject(error);
//         console.error("Error loading model:", error);
//       },
//     );
//   });
// }

// export let enemyAnimModel = null;

// export async function loadAnimModel(scene, path, onProgress, isEnemy) {
//   const localPath = await getCachedUrl(path);

//   return new Promise((resolve, reject) => {
//     const loader = new GLTFLoader();
//     loader.setDRACOLoader(dracoLoader);
//     loader.load(
//       localPath,
//       (gltf) => {
//         const model = gltf.scene;
//         scene.add(model);

//         // mixer = new THREE.AnimationMixer(gltf.scene);

//         // if (gltf.animations.length > 0) {
//         //   const action = mixer.clipAction(gltf.animations[0]);
//         //   action.play();
//         // }

//         if (isEnemy) {
//           enemyAnimModel = model;
//           console.log(`enemy model: ${path} loaded`);
//         } else {
//           console.log(`model: ${path} loaded`);
//         }

//         resolve(model);
//       },
//       (progress) => {
//         // Защита от деления на 0 при чтении из кэша
//         const percent =
//           progress.total && progress.total > 0
//             ? (progress.loaded / progress.total) * 100
//             : 100;

//         if (onProgress) onProgress(percent, `Model: ${path}`);
//       },
//       (error) => {
//         reject(error);
//         console.error("Error loading model:", error);
//       },
//     );
//   });
// }

// export function responseAnimModel(delta) {
//   if (mixer) mixer.update(delta);
// }
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";

export let mixer;

THREE.Cache.enabled = true;

async function getCachedUrl(url) {
  const cacheName = "threejs-assets-cache";

  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }

    const response = await fetch(url);
    await cache.put(url, response.clone());

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn("Кэширование недоступно, загружаем напрямую:", error);
    return url;
  }
}

export async function loadModel(scene, path, world, translate, onProgress) {
  const localPath = await getCachedUrl(path);

  return new Promise((resolve, reject) => {
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath("./draco/");
    dracoLoader.setDecoderConfig({ type: "wasm" });

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      localPath,
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        const allVertices = [];
        const allIndices = [];
        let vertexOffset = 0;

        model.traverse((child) => {
          if (child.isMesh) {
            child.geometry.computeVertexNormals();
            child.castShadow = true;
            child.receiveShadow = true;

            const geometry = child.geometry;
            if (!geometry.attributes.position) return;

            const vertices = geometry.attributes.position.array;
            const indices = geometry.index ? geometry.index.array : null;

            child.updateWorldMatrix(true, false);
            const matrix = child.matrixWorld;
            const vertex = new THREE.Vector3();

            for (let i = 0; i < vertices.length; i += 3) {
              vertex.set(vertices[i], vertices[i + 1], vertices[i + 2]);
              vertex.applyMatrix4(matrix);

              allVertices.push(
                vertex.x + translate.x,
                vertex.y + translate.y,
                vertex.z + translate.z,
              );
            }

            if (indices) {
              for (let i = 0; i < indices.length; i++) {
                allIndices.push(indices[i] + vertexOffset);
              }
            } else {
              for (let i = 0; i < vertices.length / 3; i++) {
                allIndices.push(i + vertexOffset);
              }
            }

            vertexOffset += vertices.length / 3;
          }
        });

        if (allVertices.length > 0) {
          const finalVertices = new Float32Array(allVertices);
          const finalIndices = new Uint32Array(allIndices);

          const meshBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
            0,
            0,
            0,
          );
          const meshBody = world.createRigidBody(meshBodyDesc);

          const colliderDesc = RAPIER.ColliderDesc.trimesh(
            finalVertices,
            finalIndices,
          );
          world.createCollider(colliderDesc, meshBody);

          console.log(
            `[Physics Optimized] Оптимизированный коллайдер карты создан: ${finalVertices.length / 3} вершин.`,
          );
        }

        console.log(`model: ${path} loaded`);
        dracoLoader.dispose();
        resolve();
      },
      (progress) => {
        const percent =
          progress.total && progress.total > 0
            ? (progress.loaded / progress.total) * 100
            : 100;

        if (onProgress) onProgress(percent, `model: ${path}`);
      },
      (error) => {
        dracoLoader.dispose();
        console.error("КРИТИЧЕСКАЯ ОШИБКА ЗАГРУЗКИ КАРТЫ:", error);

        throw new Error(
          "Загрузка остановлена из-за ошибки Draco. Проверьте вкладку Network.",
        );
      },
    );
  });
}

export let enemyAnimModel = null;

export async function loadAnimModel(scene, path, onProgress, isEnemy) {
  const localPath = await getCachedUrl(path);

  return new Promise((resolve, reject) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");
    dracoLoader.setDecoderConfig({ type: "wasm" });

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      localPath,
      (gltf) => {
        const model = gltf.scene;

        model.animations = gltf.animations;

        scene.add(model);

        if (!isEnemy) {
          mixer = new THREE.AnimationMixer(model);
          if (gltf.animations.length > 0) {
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
          }
        }

        if (isEnemy) {
          enemyAnimModel = model;
          console.log(
            `enemy model: ${path} loaded с ${gltf.animations.length} анимациями`,
          );
        } else {
          console.log(`model: ${path} loaded`);
        }

        dracoLoader.dispose();
        resolve(model);
      },
      (progress) => {
        const percent =
          progress.total && progress.total > 0
            ? (progress.loaded / progress.total) * 100
            : 100;
        if (onProgress) onProgress(percent, `Model: ${path}`);
      },
      (error) => {
        dracoLoader.dispose();
        reject(error);
        console.error("Error loading model:", error);
      },
    );
  });
}

export function responseAnimModel(delta) {
  if (mixer) mixer.update(delta);
}
