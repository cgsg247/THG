import * as THREE from "three";
import * as YUKA from "yuka";
import RAPIER from "@dimforge/rapier3d-compat";

export class Enemy extends YUKA.Vehicle {
  constructor(model, rapierWorld, speed = 1.5) {
    super();

    this.model = model;
    this.rapierWorld = rapierWorld;
    this.maxSpeed = speed;
    this.mass = 2.0;

    this.arriveBehavior = new YUKA.ArriveBehavior();
    this.steering.add(this.arriveBehavior);

    this._currentPosVec = new THREE.Vector3();
    this.yukaTarget = new YUKA.Vector3();
    this.arriveBehavior.target = this.yukaTarget;
    this.rayLength = 1.0;
  }

  updateTargetPosition(realPlayerPos) {
    this.yukaTarget.copy(realPlayerPos);
  }

  avoidPhysicalWalls() {
    const body = this.model.userData.physicsBody;
    if (!body) return;

    const pos = body.translation();

    const dir = new YUKA.Vector3().copy(this.velocity).normalize();

    const rayOrigin = { x: pos.x, y: pos.y + 0.5, z: pos.z };
    const rayDir = { x: dir.x, y: 0, z: dir.z };

    const ray = new RAPIER.Ray(rayOrigin, rayDir);

    const hit = this.rapierWorld.castRay(
      ray,
      this.rayLength,
      true,
      null,
      null,
      null,
      body,
    );

    if (hit && hit.toi < this.rayLength) {
      const hitPointX = rayOrigin.x + rayDir.x * hit.toi;
      const hitPointZ = rayOrigin.z + rayDir.z * hit.toi;

      const avoidanceX = -rayDir.z;
      const avoidanceZ = rayDir.x;

      const forceScale = (this.rayLength - hit.toi) * this.maxSpeed * 3.0;

      this.velocity.x += avoidanceX * forceScale;
      this.velocity.z += avoidanceZ * forceScale;
    }
  }

  syncPhysicsAndGraphics() {
    const body = this.model.userData.physicsBody;
    if (!body) return;

    this.avoidPhysicalWalls();

    body.setLinvel(
      {
        x: this.velocity.x,
        y: body.linvel().y,
        z: this.velocity.z,
      },
      true,
    );

    const position = body.translation();
    this._currentPosVec.set(position.x, position.y, position.z);
    this.position.copy(this._currentPosVec);

    this.model.position.copy(this._currentPosVec);
    if (this.model.userData.debugMesh) {
      this.model.userData.debugMesh.position.copy(this._currentPosVec);
    }

    this.model.quaternion.copy(this.rotation);
    if (this.model.userData.debugMesh) {
      this.model.userData.debugMesh.quaternion.copy(this.rotation);
    }
  }
}
