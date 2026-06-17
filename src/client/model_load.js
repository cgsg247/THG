import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";

export let mixer;

THREE.Cache.enabled = true;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
);
dracoLoader.setDecoderConfig({ type: "wasm" });

export function loadModel(scene, path, world, translate, onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        model.traverse((child) => {
          if (child.isMesh) {
            child.geometry.computeVertexNormals();
            child.castShadow = true;
            child.receiveShadow = true;

            const geometry = child.geometry;
            if (!geometry.attributes.position) return;

            let vertices = geometry.attributes.position.array;
            let indices = geometry.index ? geometry.index.array : null;

            const pos = child.getWorldPosition(new THREE.Vector3());
            const rot = child.getWorldQuaternion(new THREE.Quaternion());
            const scale = child.getWorldScale(new THREE.Vector3());

            const scaledVertices = new Float32Array(vertices.length);
            for (let i = 0; i < vertices.length; i += 3) {
              scaledVertices[i] = vertices[i] * scale.x;
              scaledVertices[i + 1] = vertices[i + 1] * scale.y;
              scaledVertices[i + 2] = vertices[i + 2] * scale.z;
            }

            const meshBodyDesc = RAPIER.RigidBodyDesc.fixed()
              .setTranslation(
                pos.x + translate.x,
                pos.y + translate.y,
                pos.z + translate.z,
              )
              .setRotation(rot);
            const meshBody = world.createRigidBody(meshBodyDesc);
            const colliderDesc = RAPIER.ColliderDesc.trimesh(
              scaledVertices,
              indices,
            );
            world.createCollider(colliderDesc, meshBody);
          }
        });
        console.log(`Модель ${path} загружена`);
        resolve();
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        if (onProgress) onProgress(percent, `Модель: ${path}`);
      },
      (error) => {
        reject(error);
        console.error("Ошибка загрузки модели:", error);
      },
    );
  });
}

export function loadAnimModel(scene, path, onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        mixer = new THREE.AnimationMixer(gltf.scene);

        if (gltf.animations.length > 0) {
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
        }

        console.log(`Модель ${path} загружена`);
        resolve();
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        if (onProgress) onProgress(percent, `Модель: ${path}`);
      },
      (error) => {
        reject(error);
        console.error("Ошибка загрузки модели:", error);
      },
    );
  });
}

export function responseAnimModel(delta) {
  if (mixer) mixer.update(delta);
}
