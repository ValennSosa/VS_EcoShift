import * as THREE from "three";

const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _qTilt = new THREE.Quaternion();
const _qYaw = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);

/**
 * @param {THREE.Object3D} parent
 * @param {THREE.BufferGeometry} geo
 * @param {THREE.Material} mat
 * @param {Array<{x:number,y:number,z:number,sx?:number,sy?:number,sz?:number,ry?:number,tilt?:number}>} transforms
 * @param {boolean} [cast=true]
 */
export function addInstanced(parent, geo, mat, transforms, cast = true) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  for (let i = 0; i < transforms.length; i += 1) {
    const t = transforms[i];
    _pos.set(t.x, t.y, t.z);
    if (t.tilt) {
      _qTilt.setFromAxisAngle(_axisX, t.tilt);
      _qYaw.setFromAxisAngle(_axisY, t.ry || 0);
      _quat.copy(_qYaw).multiply(_qTilt);
    } else {
      _euler.set(0, t.ry || 0, 0);
      _quat.setFromEuler(_euler);
    }
    _scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    _matrix.compose(_pos, _quat, _scale);
    mesh.setMatrixAt(i, _matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.maxCount = transforms.length;
  mesh.count = transforms.length;
  parent.add(mesh);
  return mesh;
}

/**
 * Ajusta cuántas instancias se renderizan sin recrear geometría.
 * @param {THREE.InstancedMesh | null | undefined} mesh
 * @param {number} ratio 0..1
 */
export function setInstanceRatio(mesh, ratio) {
  if (!mesh?.isInstancedMesh) return;
  const max = Number(mesh.userData.maxCount) || mesh.count || 0;
  const next = Math.max(0, Math.min(max, Math.round(max * clamp01(ratio))));
  if (mesh.count !== next) mesh.count = next;
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
