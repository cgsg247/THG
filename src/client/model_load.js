import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";

export let mixer;

THREE.Cache.enabled = true;

export const loadedModels = [];

function applyWireframe(model, flag) {
  model.traverse((child) => {
    if (child.isMesh) child.material.wireframe = flag;
  });
}

export function setWireframe(flag) {
  loadedModels.forEach((model) => {
    applyWireframe(model, flag);
  });
}

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

        loadedModels.push(model);

        model.traverse((child) => {
          if (child.isMesh) {
            // child.geometry.computeVertexNormals();
            // child.castShadow = true;
            // child.receiveShadow = true;

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
        if (localPath.startsWith("blob:")) {
          URL.revokeObjectURL(localPath);
        }
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
        if (localPath.startsWith("blob:")) {
          URL.revokeObjectURL(localPath);
        }
        console.error("КРИТИЧЕСКАЯ ОШИБКА ЗАГРУЗКИ КАРТЫ:", error);
        reject(error);
      },
    );
  });
}

export let enemyAnimModel = null;

export async function loadAnimModel(
  scene,
  path,
  world,
  translate,
  onProgress,
  isEnemy,
) {
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

        loadedModels.push(model);

        model.animations = gltf.animations;
        scene.add(model);

        // model.traverse((child) => {
        //   if (child.isMesh) {
        //     child.castShadow = true;
        //     child.receiveShadow = true;
        //   }
        // });

        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(translate.x, translate.y, translate.z)
          .lockRotations();

        const rigidBody = world.createRigidBody(bodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.capsule(1.0, 0.4);
        world.createCollider(colliderDesc, rigidBody);

        model.userData.physicsBody = rigidBody;

        if (isEnemy) {
          enemyAnimModel = model;
          console.log(`Enemy model with physics loaded: ${path}`);
        } else {
          characterBody = rigidBody;
          console.log(`Player model with physics loaded: ${path}`);
        }

        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations.length > 0) {
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
        }
        dracoLoader.dispose();
        if (localPath.startsWith("blob:")) {
          URL.revokeObjectURL(localPath);
        }
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
        if (localPath.startsWith("blob:")) {
          URL.revokeObjectURL(localPath);
        }
        reject(error);
        console.error("Error loading model:", error);
      },
    );
  });
}

export function responseAnimModel(delta) {
  if (mixer) mixer.update(delta);
}
