import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import RAPIER from '@dimforge/rapier3d-compat';

RAPIER.init({}).then(() => {
    runGame(RAPIER);
});

function runGame(RAPIER) {
    // 1. Физический мир
    const g = -9.80665; // free-fall acceleration
    const gravity = { x: 0.0, y: g, z: 0.0 };
    const world = new RAPIER.World(gravity);

    // 2. Сцена и камера
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // 3. Рендерер и тени
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(renderer.domElement);

    // 4. Освещение (Направленный свет + слабый эмбиент)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Массив для синхронизации физики с графикой
    const physicsPairs = [];

    // 5. Создаем физический пол
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const floorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
    const floorBody = world.createRigidBody(floorBodyDesc);
    const floorColliderDesc = RAPIER.ColliderDesc.cuboid(25, 0.1, 25);
    world.createCollider(floorColliderDesc, floorBody);

    // 6. Создаем физический куб (Препятствие на карте)
    const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: 0.5 });
    const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    cubeMesh.castShadow = true;
    cubeMesh.receiveShadow = true;
    scene.add(cubeMesh);

    const sphereRadius = 1;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    scene.add(sphereMesh);

    const cubeBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 6, -5);
    const cubeBody = world.createRigidBody(cubeBodyDesc);
    const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
    world.createCollider(cubeColliderDesc, cubeBody);
    physicsPairs.push({ mesh: cubeMesh, body: cubeBody });

    const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 12, -5);
    const sphereBody = world.createRigidBody(sphereBodyDesc);
    const sphereColliderDesc = RAPIER.ColliderDesc.ball(sphereRadius);
    world.createCollider(sphereColliderDesc, sphereBody);
    physicsPairs.push({ mesh: sphereMesh, body: sphereBody });

    // ==========================================
    // 7. СОЗДАЕМ ФИЗИЧЕСКОГО ИГРОКА И КАНАЛЫ УПРАВЛЕНИЯ
    // ==========================================

    // Физическое тело игрока (Капсула, чтобы не застревать в углах)
    const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 10, 0) // Старт над полом
        .lockRotations();       // Запрещаем игроку падать на бок (очень важно!)
    const playerBody = world.createRigidBody(playerBodyDesc);
    const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.5); // радиус 0.5, высота 1
    world.createCollider(playerColliderDesc, playerBody);

    // Подключаем управление мышью от первого лица
    const controls = new PointerLockControls(camera, renderer.domElement);

    // Активируем захват мыши при клике по экрану игры
    window.addEventListener('click', () => {
        controls.lock();
    });

    // Обработка клавиатуры WASD
    const keys = { w: false, a: false, s: false, d: false };
    window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false; });

    // Векторы для расчета направления движения
    const moveDirection = new THREE.Vector3();
    const frontVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();
    const speed = 6; // Скорость ходьбы игрока

    // 8. Игровой цикл
    function animate() {
        requestAnimationFrame(animate);

        // Шаг физического мира
        world.step();

        // Синхронизируем физические тела (наш зеленый куб) с графикой
        physicsPairs.forEach(pair => {
            const position = pair.body.translation();
            const rotation = pair.body.rotation();
            pair.mesh.position.set(position.x, position.y, position.z);
            pair.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        });

        // ЛОГИКА ДВИЖЕНИЯ ИГРОКА (Только если курсор мыши захвачен игрой)
        if (controls.isLocked) {
            // Рассчитываем вектор "вперед/назад" на основе направления взгляда камеры
            frontVector.set(0, 0, Number(keys.w) - Number(keys.s));
            // Рассчитываем вектор "влево/вправо"
            sideVector.set(0, 0, Number(keys.d) - Number(keys.a));

            // Проецируем движения на плоскость пола (чтобы игрок не летал вверх, смотря в небо)
            camera.getWorldDirection(moveDirection);
            moveDirection.y = 0;
            moveDirection.normalize();

            // Создаем финальный вектор скорости
            const targetVelocityX = (moveDirection.x * frontVector.z + camera.up.clone().cross(moveDirection).negate().x * sideVector.z) * speed;
            const targetVelocityZ = (moveDirection.z * frontVector.z + camera.up.clone().cross(moveDirection).negate().z * sideVector.z) * speed;

            // Сохраняем текущую силу гравитации по оси Y, чтобы игрок мог падать
            const currentYVelocity = playerBody.linvel().y;

            // Прикладываем скорость к физическому телу игрока
            playerBody.setLinvel({ x: targetVelocityX, y: currentYVelocity, z: targetVelocityZ }, true);
        } else {
            // Если игра на паузе (курсор отпущен) — игрок останавливается, но продолжает падать под гравитацией
            playerBody.setLinvel({ x: 0, y: playerBody.linvel().y, z: 0 }, true);
        }

        // Привязываем позицию камеры к физическим координатам тела игрока (на уровне глаз)
        const playerPos = playerBody.translation();
        camera.position.set(playerPos.x, playerPos.y + 0.8, playerPos.z);

        renderer.render(scene, camera);
    }

    // Изменение размеров окна
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}