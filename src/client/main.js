import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { Pane } from 'tweakpane';
import { loadBackrooms } from './model_load.js';
import { GameMenu } from './menu.js';

RAPIER.init({}).then(() => {
    runGame(RAPIER);
});

function isGrounded(world, playerBody, jumpParams) {
    const pos = playerBody.translation();
    const ray = new RAPIER.Ray(
        { x: pos.x, y: pos.y - 0.8, z: pos.z },
        { x: 0, y: -1, z: 0 }
    );
    const hit = world.castRay(ray, jumpParams.groundCheck, true);
    return hit !== null;
}

function runGame(RAPIER) {
    // 1. Физический мир
    const g = -9.80665; // free-fall acceleration
    const gravity = { x: 0.0, y: g, z: 0.0 };
    const world = new RAPIER.World(gravity);

    // 2. Сцена и камера
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');

    // Создание перспективной камеры
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // 3. Рендерер и тени
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(renderer.domElement);

    // Загрузка модели окружения (Backrooms)
    loadBackrooms(scene, './assets/models/original_backrooms.glb');

    // // Spot light фонарик
    // const flashlight = new THREE.SpotLight(0xffeedd);
    // flashlight.intensity = 3.0;
    // flashlight.distance = 20;
    // flashlight.angle = 0.6;       // узкий конус
    // flashlight.penumbra = 0.5;    // мягкий край
    // flashlight.decay = 1.0;       // быстрое затухание
    // flashlight.castShadow = true;
    // flashlight.shadow.mapSize.width = 1024;
    // flashlight.shadow.mapSize.height = 1024;
    // flashlight.shadow.bias = -0.0001;

    // // Цель для фонарика (светит вперёд)
    // const flashlightTarget = new THREE.Object3D();
    // flashlightTarget.position.set(0, 0, -5);
    // camera.add(flashlightTarget);
    // flashlight.target = flashlightTarget;

    // // Добавляем фонарик на камеру
    // camera.add(flashlight);

    // // Маленький свет вокруг игрока (мягкое свечение)
    // const playerGlow = new THREE.PointLight(0x886644, 0.2, 8);
    // playerGlow.castShadow = false;
    // camera.add(playerGlow);

    // console.log('Фонарик добавлен на камеру');
    // console.log('Позиция фонарика:', flashlight.position);
    // console.log('Цель фонарика:', flashlight.target.position);

    // Освещение (Направленный свет + слабый эмбиент)
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
    const floorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
    const floorBody = world.createRigidBody(floorBodyDesc);
    const floorColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.2, 50);
    world.createCollider(floorColliderDesc, floorBody);

    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

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
    const controls = new PointerLockControls(camera, document.body);

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ МЕНЮ
    // ==========================================
    const gameMenu = new GameMenu();
    let isGameActive = false, isPaused = false;

    gameMenu.onStart(() => {
        gameMenu.hideMain();
        isGameActive = true;
        isPaused = false;
        setTimeout(() => {
            if (!controls.isLocked) {
                controls.lock();
            }
        }, 200);
    });

    gameMenu.onResume(() => {
        gameMenu.hidePause();
        isPaused = false;
        isGameActive = true;
        setTimeout(() => {
            if (!controls.isLocked) {
                controls.lock();
            }
        }, 200);
    });

    gameMenu.onExit(() => {
        gameMenu.showMain();
        isGameActive = isPaused = false;
        if (controls.isLocked) controls.unlock();
        gameMenu.reset(playerBody, controls);
    });

    gameMenu.onEscape(
        () => {
            if (isGameActive && !isPaused) {
                gameMenu.showPause();
                isPaused = true;
                isGameActive = false;
                if (controls.isLocked) controls.unlock();
            }
        },
        () => {
            gameMenu.hidePause();
            isPaused = false;
            isGameActive = true;
            setTimeout(() => {
                if (!controls.isLocked) {
                    controls.lock();
                }
            }, 200);
        }
    );

    gameMenu.showMain();

    // ==========================================
    // НАСТРОЙКИ UI
    // ==========================================
    const pane = new Pane('Geometry control', document.getElementById('panel'));

    // Блокируем всплытие событий на панели
    const panelDiv = document.getElementById('panel');
    if (panelDiv) {
        panelDiv.addEventListener('mousedown', (e) => e.stopPropagation());
        panelDiv.addEventListener('mouseup', (e) => e.stopPropagation());
    }

    // Обработчик для UI панели
    pane.on('change', () => {
        if (controls && controls.isLocked) {
            controls.unlock();
        }
    });

    // Глобальный флаг для отслеживания состояния блокировки
    let isPointerLocked = false;

    // Обработчики событий Pointer Lock
    controls.domElement.addEventListener('pointerlockchange', () => {
        isPointerLocked = controls.isLocked;
        console.log('Pointer lock changed:', isPointerLocked);
    });

    controls.domElement.addEventListener('pointerlockerror', () => {
        console.log('Pointer lock failed, will retry on next click');
    });

    window.addEventListener('click', () => {
        if (isGameActive && !isPaused && !controls.isLocked) {
            setTimeout(() => {
                try {
                    controls.lock();
                } catch (error) {
                    console.warn('Failed to lock:', error);
                }
            }, 50);
        }
    });;

    // Обработка клавиатуры
    const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        const code = e.code;

        if (!isGameActive || isPaused)
            return;

        if (key === 'w' || key === 'ц' || code === 'KeyW') keys.w = true;
        if (key === 'a' || key === 'ф' || code === 'KeyA') keys.a = true;
        if (key === 's' || key === 'ы' || code === 'KeyS') keys.s = true;
        if (key === 'd' || key === 'в' || code === 'KeyD') keys.d = true;

        if (e.code === 'Space') {
            keys.space = true;
            e.preventDefault();
        }
        if (e.code === 'Shift') {
            keys.shift = true;
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        const code = e.code;

        if (!isGameActive || isPaused)
            return

        if (key === 'w' || key === 'ц' || code === 'KeyW') keys.w = false;
        if (key === 'a' || key === 'ф' || code === 'KeyA') keys.a = false;
        if (key === 's' || key === 'ы' || code === 'KeyS') keys.s = false;
        if (key === 'd' || key === 'в' || code === 'KeyD') keys.d = false;

        if (e.code === 'Space') {
            keys.space = false;
            e.preventDefault();
        }
        if (e.code === 'Shift') {
            keys.shift = false;
            e.preventDefault();
        }
    });
    window.addEventListener('blur', () => {
        if (isGameActive && !isPaused && controls.isLocked) {
            gameMenu.showPause();
            isPaused = true;
            isGameActive = false;
            if (controls.isLocked) controls.unlock();
        }
    });
    // Векторы для расчета направления движения
    const moveDirection = new THREE.Vector3();
    const frontVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();

    // Параметры скорости игрока
    const PARAMS = {
        speed: 6,
        boost: 1.8
    };

    pane.addBinding(PARAMS, 'speed', {
        min: 0.1,
        max: 20,
        step: 0.05,
    });

    // Параметры прыжка игрока
    const jumpParams = {
        force: 5.5,
        groundCheck: 0.85
    };

    pane.addBinding(jumpParams, 'force', { min: 3, max: 10, step: 0.1 });
    pane.addBinding(jumpParams, 'groundCheck', { min: 0.5, max: 1.2, step: 0.05 });

    let canJump = true;

    // 8. Игровой цикл
    function animate() {
        requestAnimationFrame(animate);

        if (!isGameActive || isPaused) {
            renderer.render(scene, camera);
            return;
        }

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
            // ПРЫЖОК
            const grounded = isGrounded(world, playerBody, jumpParams);
            if (keys.space && grounded && canJump) {
                const vel = playerBody.linvel();
                playerBody.setLinvel({ x: vel.x, y: jumpParams.force, z: vel.z }, true);
                console.log("Прыжок");
                canJump = false;
            }
            if (grounded && !keys.space)
                canJump = true; // защита от повторного прыжка

            frontVector.set(0, 0, Number(keys.w) - Number(keys.s));
            sideVector.set(0, 0, Number(keys.d) - Number(keys.a));

            camera.getWorldDirection(moveDirection);
            moveDirection.y = 0;
            moveDirection.normalize();

            let current_speed;
            // Усокрение по shift
            if (keys.shift)
                current_speed = PARAMS.speed * PARAMS.boost;
            else
                current_speed = PARAMS.speed;

            const targetVelocityX = (moveDirection.x * frontVector.z + camera.up.clone().cross(moveDirection).negate().x * sideVector.z) * current_speed;
            const targetVelocityZ = (moveDirection.z * frontVector.z + camera.up.clone().cross(moveDirection).negate().z * sideVector.z) * current_speed;

            const currentYVelocity = playerBody.linvel().y;

            playerBody.setLinvel({ x: targetVelocityX, y: currentYVelocity, z: targetVelocityZ }, true);
        }

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