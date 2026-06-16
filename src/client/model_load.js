import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";

export let mixer;

export function loadModel(scene, path, world) {
  const loader = new GLTFLoader();

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
            .setTranslation(pos.x, pos.y, pos.z)
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
    },
    (progress) => {
      const percent = (progress.loaded / progress.total) * 100;
      console.log(`загрузка: ${Math.round(percent)}%`);
    },
    (error) => {
      console.error("Ошибка загрузки модели:", error);
    },
  );
}

export function loadAnimModel(scene, path) {
  const loader = new GLTFLoader();

  loader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      mixer = new THREE.AnimationMixer(gltf.scene);

      const action = mixer.clipAction(gltf.animations[0]);
      action.play();

      console.log(`Модель ${path} загружена`);
    },
    (progress) => {
      const percent = (progress.loaded / progress.total) * 100;
      console.log(`загрузка: ${Math.round(percent)}%`);
    },
    (error) => {
      console.error("Ошибка загрузки модели:", error);
    },
  );
}

export function responseAnimModel(delta) {
  if (mixer) mixer.update(delta);
}
