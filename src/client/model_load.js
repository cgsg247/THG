import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadBackrooms(scene, path = './assets/models/original_backrooms.glb') {
    const loader = new GLTFLoader();

    loader.load(path,
        (gltf) => {
            scene.add(gltf.scene);
            console.log('Модель BackRooms загружена');
        },
        (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`загрузка: ${Math.round(percent)}%`);
        },
        (error) => {
            console.error('Ошибка загрузки модели:', error);
        }
    );
}