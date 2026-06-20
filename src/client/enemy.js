import * as THREE from "three";
import { Graph, astar } from "javascript-astar";

export class Enemy {
  constructor(model, gridData, speed = 2.5) {
    this.model = model;
    this.gridData = gridData;
    this.speed = speed;

    const astarMatrix = [];
    for (let r = 0; r < gridData.rows; r++) {
      astarMatrix[r] = [];
      for (let c = 0; c < gridData.cols; c++) {
        astarMatrix[r][c] = gridData.grid[c][r] ? 1 : 0;
      }
    }
    this.graph = new Graph(astarMatrix);

    this.path = [];
    this.currentWaypoint = 0;
    this.recalcTimer = 0;
  }

  update(delta, playerPosition) {
    if (!this.model.userData.physicsBody) return;
    const body = this.model.userData.physicsBody;
    const enemyPos = body.translation();

    this.recalcTimer += delta;

    if (this.recalcTimer > 0.4) {
      this.recalcTimer = 0;
      this.calculatePath(
        new THREE.Vector3(enemyPos.x, enemyPos.y, enemyPos.z),
        playerPosition,
      );
    }

    if (this.path.length > 0 && this.currentWaypoint < this.path.length) {
      const targetPoint = this.path[this.currentWaypoint];

      const distance = Math.hypot(
        targetPoint.x - enemyPos.x,
        targetPoint.z - enemyPos.z,
      );

      if (distance < 0.4) {
        this.currentWaypoint++;
      } else {
        const dir = new THREE.Vector3(
          targetPoint.x - enemyPos.x,
          0,
          targetPoint.z - enemyPos.z,
        ).normalize();

        body.setLinvel(
          {
            x: dir.x * this.speed,
            y: body.linvel().y,
            z: dir.z * this.speed,
          },
          true,
        );

        const angle = Math.atan2(dir.x, dir.z);
        const rotation = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          angle,
        );
        body.setRotation(rotation, true);
      }
    } else {
      body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
    }
  }

  calculatePath(startWorldPos, endWorldPos) {
    const startGrid = this.gridData.worldToGrid(startWorldPos);
    const endGrid = this.gridData.worldToGrid(endWorldPos);

    if (!startGrid || !endGrid) return;

    const startNode = this.graph.grid[startGrid.row][startGrid.col];
    const endNode = this.graph.grid[endGrid.row][endGrid.col];

    const result = astar.search(this.graph, startNode, endNode, {
      closest: true,
    });

    this.path = result.map((node) => this.gridData.gridToWorld(node.y, node.x));
    this.currentWaypoint = 0;
  }

  setSpeed(newSpeed) {
    this.speed = newSpeed;
  }
}

export function initGrid(scene) {
  // Scene bound box
  const box = new THREE.Box3().setFromObject(scene);
  const min = box.min;
  const max = box.max;

  // Size of 1 grid cell
  let cellSize = 0.5;
  // Grid size (count of columms and rows)
  let cols = Math.ceil((max.x - min.x) / cellSize);
  let rows = Math.ceil((max.z - min.z) / cellSize);

  // Optimizer
  if (cols > 500 || rows > 500) {
    console.warn(`[Grid] so far (${cols}x${rows}). Optimize cellSize.`);
    cellSize = Math.max(max.x - min.x, max.z - min.z) / 200;
    cols = Math.ceil((max.x - min.x) / cellSize);
    rows = Math.ceil((max.z - min.z) / cellSize);
  }

  // RayCast (check for floor)
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3(0, -1, 0);

  // Check is cell walkable
  function isCellWalkable(col, row) {
    const x = min.x + col * cellSize + cellSize / 2;
    const z = min.z + row * cellSize + cellSize / 2;

    raycaster.set(new THREE.Vector3(x, 10, z), direction);
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
