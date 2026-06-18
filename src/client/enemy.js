// import * as THREE from "three";
// import RAPIER from "@dimforge/rapier3d-compat";

// export function initGrid(scene) {
//   // Scene bound box
//   const box = new THREE.Box3().setFromObject(scene);
//   const min = box.min;
//   const max = box.max;

//   // Size of 1 grid cell
//   const cellSize = 0.5;
//   // Grid size (count of columms and rows)
//   const cols = Math.ceil((max.x - min.x) / cellSize);
//   const rows = Math.ceil((max.z - min.z) / cellSize);

//   // Check is cell walkable
//   function isCellWalkable(col, row) {
//     const x = min.x + col * cellSize + cellSize / 2;
//     const z = min.z + row * cellSize + cellSize / 2;
//     const ray = new RAPIER.Ray({ x, y: 2, z }, { x: 0, y: -1, z: 0 });
//     const hit = world.castRay(ray, 5, true);
//     if (hit === null) return false;
//     if (hit.normal.y < 0.5) return false;
//     return true;
//   }

//   // Array of states of each cell
//   const grid = [];

//   // For each cell we check whether the enemy can move through it
//   for (let col = 0; col < cols; col++) {
//     grid[col] = [];
//     for (let row = 0; row < rows; row++) {
//       grid[col][row] = isCellWalkable(col, row);
//     }
//   }
// }
// enemy.js
import * as THREE from "three";
//import RAPIER from "@dimforge/rapier3d-compat";

export function initGrid(scene, world, cellSize = 0.5, enemyRadius = 0.5) {
  const box = new THREE.Box3().setFromObject(scene);
  const min = box.min;
  const max = box.max;

  let cols = Math.ceil((max.x - min.x) / cellSize);
  let rows = Math.ceil((max.z - min.z) / cellSize);

  if (cols > 500 || rows > 500) {
    console.warn(
      `[Grid] Сетка слишком огромная (${cols}x${rows}). Оптимизируем cellSize.`,
    );
    cellSize = Math.max(max.x - min.x, max.z - min.z) / 200;
    cols = Math.ceil((max.x - min.x) / cellSize);
    rows = Math.ceil((max.z - min.z) / cellSize);
  }

  const raycaster = new THREE.Raycaster();
  const downDirection = new THREE.Vector3(0, -1, 0);

  function isCellWalkable(col, row) {
    const x = min.x + col * cellSize + cellSize / 2;
    const z = min.z + row * cellSize + cellSize / 2;

    raycaster.set(new THREE.Vector3(x, 10, z), downDirection);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length === 0) return false;

    const firstHit = intersects[0];

    if (firstHit.face && firstHit.face.normal) {
      const normal = firstHit.face.normal.clone();
      if (firstHit.object) {
        normal.applyQuaternion(
          firstHit.object.getWorldQuaternion(new THREE.Quaternion()),
        );
      }
      if (normal.y < 0.7) return false;
    }

    return true;
  }

  console.log(`[Grid] Начинаем генерацию сетки ${cols}x${rows}...`);
  const grid = [];
  let walkableCount = 0;

  for (let col = 0; col < cols; col++) {
    grid[col] = [];
    for (let row = 0; row < rows; row++) {
      const walkable = isCellWalkable(col, row);
      grid[col][row] = walkable;
      if (walkable) walkableCount++;
    }
  }
  console.log(
    `[Grid] Сетка сгенерирована. Проходимых ячеек: ${walkableCount} из ${cols * rows}`,
  );

  const radiusInCells = Math.ceil(enemyRadius / cellSize);
  const expandedGrid = grid.map((row) => [...row]);

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (!grid[col][row]) {
        const minC = Math.max(0, col - radiusInCells);
        const maxC = Math.min(cols - 1, col + radiusInCells);
        const minR = Math.max(0, row - radiusInCells);
        const maxR = Math.min(rows - 1, row + radiusInCells);

        for (let nc = minC; nc <= maxC; nc++) {
          for (let nr = minR; nr <= maxR; nr++) {
            expandedGrid[nc][nr] = false;
          }
        }
      }
    }
  }

  function worldToGrid(pos) {
    const col = Math.floor((pos.x - min.x) / cellSize);
    const row = Math.floor((pos.z - min.z) / cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    return { col, row };
  }

  function gridToWorld(col, row) {
    return new THREE.Vector3(
      min.x + col * cellSize + cellSize / 2,
      0,
      min.z + row * cellSize + cellSize / 2,
    );
  }

  return {
    grid: expandedGrid,
    cols,
    rows,
    min,
    max,
    cellSize,
    worldToGrid,
    gridToWorld,
  };
}

export class Enemy {
  constructor(model, gridData, startPosition, speed = 2.0) {
    this.model = model;
    this.gridData = gridData;
    this.position = startPosition.clone();
    this.speed = speed;

    this.path = [];
    this.currentTargetIndex = 0;
    this.updateInterval = 0.5; // пересчёт пути каждые 0.5 сек
    this.timer = 0;

    // Анимации (предполагаем, что есть walk и idle)
    this.mixer = new THREE.AnimationMixer(model);
    this.animations = {};
    if (model.animations && model.animations.length > 0) {
      // Если есть хотя бы одна анимация – используем её как walk
      this.walkAction = this.mixer.clipAction(model.animations[0]);
      if (model.animations.length > 1) {
        this.idleAction = this.mixer.clipAction(model.animations[1]);
      } else {
        // если только одна – дублируем
        this.idleAction = this.walkAction;
      }
      // по умолчанию проигрываем idle
      this.idleAction.play();
      this.currentAction = this.idleAction;
    } else {
      // если анимаций нет – заглушки
      this.walkAction = null;
      this.idleAction = null;
      this.currentAction = null;
    }

    // Сохраняем методы сетки
    this.worldToGrid = gridData.worldToGrid.bind(gridData);
    this.gridToWorld = gridData.gridToWorld.bind(gridData);
    this.grid = gridData.grid;
    this.cols = gridData.cols;
    this.rows = gridData.rows;

    // Начальная позиция модели
    this.model.position.copy(this.position);
  }

  // Основной метод обновления (вызывается каждый кадр)
  update(delta, playerPosition) {
    this.timer += delta;

    // 1. Периодический пересчёт пути
    if (this.timer >= this.updateInterval) {
      this.timer = 0;

      let startCell = this.worldToGrid(this.position);
      let targetCell = this.worldToGrid(playerPosition);

      if (startCell && targetCell) {
        if (!this.grid[startCell.col][startCell.row]) {
          startCell = this.findNearestWalkable(startCell);
        }
        if (!this.grid[targetCell.col][targetCell.row]) {
          targetCell = this.findNearestWalkable(targetCell);
        }

        if (startCell && targetCell) {
          const newPath = this.findPath(startCell, targetCell);
          if (newPath && newPath.length > 1) {
            this.path = newPath;
            this.currentTargetIndex = 1;
            console.log(`[AI] Путь найден! Точек в пути: ${this.path.length}`);
          } else {
            this.path = [];
          }
        }
      }
    }

    // 2. Движение по пути (Исправленное)
    if (this.path.length > 1 && this.currentTargetIndex < this.path.length) {
      const targetIdx = this.path[this.currentTargetIndex];
      const targetWorld = this.gridToWorld(targetIdx.col, targetIdx.row);

      // СОЗДАЕМ ТЕКУЩИЙ И ЦЕЛЕВОЙ ВЕКТОРЫ СТРОГО В 2D (Игнорируем Y)
      const currentPos2D = new THREE.Vector2(this.position.x, this.position.z);
      const targetPos2D = new THREE.Vector2(targetWorld.x, targetWorld.z);

      const distance2D = currentPos2D.distanceTo(targetPos2D);

      // Если в горизонтальной плоскости дошли до ячейки — переключаемся на следующую
      if (distance2D < 0.25) {
        this.currentTargetIndex++;
        if (this.currentTargetIndex >= this.path.length) {
          this.playAnimation("idle");
        }
      } else {
        // Вычисляем направление движения только по X и Z
        const direction3D = new THREE.Vector3(
          targetWorld.x - this.position.x,
          0, // Зануляем вертикаль, чтобы он не шел "под землю"
          targetWorld.z - this.position.z,
        ).normalize();

        const step = this.speed * delta;
        this.position.add(
          direction3D.multiplyScalar(Math.min(step, distance2D)),
        );

        // Плавный поворот в сторону следующей точки
        const lookTarget = new THREE.Vector3(
          targetWorld.x,
          this.position.y,
          targetWorld.z,
        );
        this.model.lookAt(lookTarget);

        this.playAnimation("walk");
      }
    } else {
      this.playAnimation("idle");
    }

    // 3. Синхронизация модели
    this.model.position.copy(this.position);
    if (this.mixer) this.mixer.update(delta);
  }

  // BFS – поиск кратчайшего пути
  findPath(start, target) {
    const queue = [];
    const visited = new Set();
    const parent = new Map();

    const key = (col, row) => `${col},${row}`;
    queue.push(start);
    visited.add(key(start.col, start.row));
    parent.set(key(start.col, start.row), null);

    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.col === target.col && current.row === target.row) {
        // Восстановление пути
        const path = [];
        let cell = current;
        while (cell) {
          path.push(cell);
          const parentKey = key(cell.col, cell.row);
          cell = parent.get(parentKey);
        }
        path.reverse();
        return path;
      }
      for (const [dc, dr] of dirs) {
        const nc = current.col + dc;
        const nr = current.row + dr;
        if (nc >= 0 && nc < this.cols && nr >= 0 && nr < this.rows) {
          const k = key(nc, nr);
          if (!visited.has(k) && this.grid[nc][nr] === true) {
            visited.add(k);
            parent.set(k, current);
            queue.push({ col: nc, row: nr });
          }
        }
      }
    }
    return null; // путь не найден
  }

  // Переключение анимаций
  playAnimation(name) {
    if (!this.walkAction || !this.idleAction) return;

    if (name === "walk" && this.currentAction !== this.walkAction) {
      this.idleAction.stop();
      this.walkAction.play();
      this.currentAction = this.walkAction;
    } else if (name === "idle" && this.currentAction !== this.idleAction) {
      this.walkAction.stop();
      this.idleAction.play();
      this.currentAction = this.idleAction;
    }
  }

  // Метод для изменения скорости (будет вызываться из UI)
  setSpeed(newSpeed) {
    this.speed = newSpeed;
  }
}
