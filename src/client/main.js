import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import RAPIER from '@dimforge/rapier3d-compat';

RAPIER.init({}).then(() => {
    runGame(RAPIER);
});

function runGame(RAPIER) {
    // 1. Physical world
    const g = -9.80665; // free-fall acceleration
    const gravity = { x: 0.0, y: g, z: 0.0 };
    const world = new RAPIER.World(gravity);

    // 2. Stage and camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // 3. Renderer and shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(renderer.domElement);

    // 4. Lighting (Directional light + low ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Array for synchronizing physics with graphics
    const physicsPairs = [];

    // 5. Creating a physical floor
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

    // 6. Create a physical cube and a ball (Obstacle on the map)
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
    // 7. CREATING A PHYSICAL PLAYER AND CONTROL CHANNELS
    // ==========================================

    // Player's physical body (Capsule to avoid getting stuck in corners)
    const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 0, 0) // Start position
        .lockRotations();        // Prevents the player from falling on his side
    const playerBody = world.createRigidBody(playerBodyDesc);
    const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.5); // radius 0.5, height 0.5
    world.createCollider(playerColliderDesc, playerBody);

    // Enable first-person mouse control
    const controls = new PointerLockControls(camera, renderer.domElement);

    // Activate mouse capture when clicking on the game screen
    window.addEventListener('click', () => {
        controls.lock();
    });

    // Handling the WASD keyboard
    const keys = { w: false, a: false, s: false, d: false };
    window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false; });

    // Vectors for calculating the direction of movement
    const moveDirection = new THREE.Vector3();
    const frontVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();
    const speed = 6; // Player walking speed

    // 8. Game loop
    function animate() {
        requestAnimationFrame(animate);

        // Step of the physical world
        world.step();

        // Synchronize the physical bodies (our green cube) with the graphics
        physicsPairs.forEach(pair => {
            const position = pair.body.translation();
            const rotation = pair.body.rotation();
            pair.mesh.position.set(position.x, position.y, position.z);
            pair.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        });

        // PLAYER MOVEMENT LOGIC (Only if the mouse cursor is captured by the game)
        if (controls.isLocked) {
            // Calculate the forward/backward vector based on the camera's viewing direction
            frontVector.set(0, 0, Number(keys.w) - Number(keys.s));
            // Calculate the left/right vector
            sideVector.set(0, 0, Number(keys.d) - Number(keys.a));

            // Project the movements onto the floor plane (so the player doesn't fly up while looking at the sky)
            camera.getWorldDirection(moveDirection);
            moveDirection.y = 0;
            moveDirection.normalize();

            // Create the final velocity vector
            const targetVelocityX = (moveDirection.x * frontVector.z + camera.up.clone().cross(moveDirection).negate().x * sideVector.z) * speed;
            const targetVelocityZ = (moveDirection.z * frontVector.z + camera.up.clone().cross(moveDirection).negate().z * sideVector.z) * speed;

            // Store the current gravity on the Y axis so the player can fall
            const currentYVelocity = playerBody.linvel().y;

            // Apply velocity to the player's physical body
            playerBody.setLinvel({ x: targetVelocityX, y: currentYVelocity, z: targetVelocityZ }, true);
        } else {
            // If the game is paused (the cursor is released), the player stops, but continues to fall under gravity
            playerBody.setLinvel({ x: 0, y: playerBody.linvel().y, z: 0 }, true);
        }

        // Bind the camera position to the physical coordinates of the player's body (at eye level)
        const playerPos = playerBody.translation();
        camera.position.set(playerPos.x, playerPos.y + 0.8, playerPos.z);

        renderer.render(scene, camera);
    }

    // Resizing the window
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}