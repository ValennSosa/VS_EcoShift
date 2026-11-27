import * as THREE from "three";
import {
  CURB_HEIGHT,
  CURB_WIDTH,
  PLATFORM_SIZE,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  STREET_XS,
  STREET_ZS,
  ZONE_BLOCK_MAP,
  ZONE_LAYOUT,
  computeBlocks,
} from "../layout.js";

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Construye la trama urbana PBR: calles, veredas, cordones, manzanas y lotes.
 * No incorpora tipologías arquitectónicas GLB (reservado a R2).
 *
 * @param {THREE.Scene | THREE.Group} parent
 * @param {{ mats: Record<string, THREE.Material> }} materialKit
 */
export function buildUrbanTrama(parent, materialKit) {
  const { mats } = materialKit;
  const root = new THREE.Group();
  root.name = "urban-trama";
  parent.add(root);

  /** @type {THREE.BufferGeometry[]} */
  const geos = [];
  const blocks = computeBlocks();

  // Pedestal suave (borde de ciudad)
  const pedestal = makeTexturedPlane(PLATFORM_SIZE + 1.6, PLATFORM_SIZE + 1.6, 6, 6, geos);
  const pedestalMesh = new THREE.Mesh(
    pedestal,
    new THREE.MeshStandardMaterial({
      color: 0x0f2a22,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  pedestalMesh.rotation.x = -Math.PI / 2;
  pedestalMesh.position.y = -0.04;
  pedestalMesh.receiveShadow = true;
  root.add(pedestalMesh);

  // Relleno base con césped urbano (entre calzadas / bordes)
  const baseGrass = makeTexturedPlane(PLATFORM_SIZE - 0.4, PLATFORM_SIZE - 0.4, 10, 10, geos);
  const baseGrassMesh = new THREE.Mesh(baseGrass, mats.grass);
  baseGrassMesh.rotation.x = -Math.PI / 2;
  baseGrassMesh.position.y = 0.001;
  baseGrassMesh.receiveShadow = true;
  root.add(baseGrassMesh);

  const roadGroup = new THREE.Group();
  roadGroup.name = "roads";
  root.add(roadGroup);

  const span = STREET_XS[STREET_XS.length - 1] - STREET_XS[0];

  // Calles N–S
  for (const x of STREET_XS) {
    const length = span + ROAD_WIDTH;
    const geo = makeTexturedPlane(ROAD_WIDTH, length, ROAD_WIDTH / 2.2, length / 2.2, geos);
    const mesh = new THREE.Mesh(geo, mats.asphalt);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, 0);
    mesh.receiveShadow = true;
    roadGroup.add(mesh);
  }

  // Calles E–O
  for (const z of STREET_ZS) {
    const length = span + ROAD_WIDTH;
    const geo = makeTexturedPlane(length, ROAD_WIDTH, length / 2.2, ROAD_WIDTH / 2.2, geos);
    const mesh = new THREE.Mesh(geo, mats.asphalt);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.021, z);
    mesh.receiveShadow = true;
    roadGroup.add(mesh);
  }

  // Veredas + cordones por manzana
  const sidewalkGroup = new THREE.Group();
  sidewalkGroup.name = "sidewalks";
  root.add(sidewalkGroup);

  const curbGeo = new THREE.BoxGeometry(1, 1, 1);
  geos.push(curbGeo);

  for (const block of blocks) {
    addBlockSidewalks(sidewalkGroup, block, mats, geos);
    addBlockCurbs(sidewalkGroup, block, mats, curbGeo);
  }

  // Lotes preparados (superficie diferenciada)
  const lotsGroup = new THREE.Group();
  lotsGroup.name = "lots";
  root.add(lotsGroup);

  const zoneByBlock = Object.fromEntries(
    Object.entries(ZONE_BLOCK_MAP).map(([zoneId, blockId]) => [blockId, zoneId])
  );

  for (const block of blocks) {
    const zoneId = zoneByBlock[block.id] || null;
    const surfaceKey = zoneId ? ZONE_LAYOUT[zoneId]?.surface : "lot";
    const mat =
      surfaceKey === "park" ? mats.park : surfaceKey === "lot" ? mats.lot : mats.grass;
    const geo = makeTexturedPlane(
      block.lotHalfX * 2,
      block.lotHalfZ * 2,
      (block.lotHalfX * 2) / 2.5,
      (block.lotHalfZ * 2) / 2.5,
      geos
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `lot-${block.id}`;
    mesh.userData.blockId = block.id;
    mesh.userData.zoneId = zoneId;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(block.cx, 0.035, block.cz);
    mesh.receiveShadow = true;
    lotsGroup.add(mesh);
  }

  // Marcas de carril e intersecciones
  addLaneMarkings(roadGroup, mats, geos);
  addCrosswalks(roadGroup, mats, geos);

  return {
    root,
    blocks,
    disposables: [...geos, pedestalMesh.material],
    lotsGroup,
  };
}

/**
 * Plano XZ con UVs repetidos + uv2 para aoMap.
 * @param {number} width
 * @param {number} depth
 * @param {number} tileU
 * @param {number} tileV
 * @param {THREE.BufferGeometry[]} geos
 */
function makeTexturedPlane(width, depth, tileU, tileV, geos) {
  const geo = new THREE.PlaneGeometry(width, depth, 1, 1);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * tileU, uv.getY(i) * tileV);
  }
  uv.needsUpdate = true;
  geo.setAttribute("uv2", uv.clone());
  geos.push(geo);
  return geo;
}

function addBlockSidewalks(group, block, mats, geos) {
  // Anillo de vereda: manzana completa menos el lote interior (4 franjas).
  const outerHalfX = block.halfX + SIDEWALK_WIDTH;
  const outerHalfZ = block.halfZ + SIDEWALK_WIDTH;
  const y = 0.045;

  // Norte / Sur (a lo largo de X)
  const stripZ = SIDEWALK_WIDTH;
  const lenX = outerHalfX * 2;
  for (const sign of [-1, 1]) {
    const z = block.cz + sign * (block.halfZ + SIDEWALK_WIDTH / 2);
    const geo = makeTexturedPlane(lenX, stripZ, lenX / 1.6, stripZ / 1.2, geos);
    const mesh = new THREE.Mesh(geo, mats.sidewalk);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(block.cx, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Este / Oeste (a lo largo de Z), sin solapar esquinas ya cubiertas
  const stripX = SIDEWALK_WIDTH;
  const lenZ = block.halfZ * 2;
  for (const sign of [-1, 1]) {
    const x = block.cx + sign * (block.halfX + SIDEWALK_WIDTH / 2);
    const geo = makeTexturedPlane(stripX, lenZ, stripX / 1.2, lenZ / 1.6, geos);
    const mesh = new THREE.Mesh(geo, mats.sidewalk);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, block.cz);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Esquinas de vereda (cuadrados)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const geo = makeTexturedPlane(SIDEWALK_WIDTH, SIDEWALK_WIDTH, 0.7, 0.7, geos);
      const mesh = new THREE.Mesh(geo, mats.sidewalk);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        block.cx + sx * (block.halfX + SIDEWALK_WIDTH / 2),
        y + 0.001,
        block.cz + sz * (block.halfZ + SIDEWALK_WIDTH / 2)
      );
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  void outerHalfX;
  void outerHalfZ;
}

function addBlockCurbs(group, block, mats, box) {
  const y = CURB_HEIGHT / 2;

  const segments = [
    // norte
    {
      x: block.cx,
      z: block.cz - (block.halfZ + SIDEWALK_WIDTH + CURB_WIDTH / 2),
      sx: block.halfX * 2 + SIDEWALK_WIDTH * 2,
      sz: CURB_WIDTH,
    },
    // sur
    {
      x: block.cx,
      z: block.cz + (block.halfZ + SIDEWALK_WIDTH + CURB_WIDTH / 2),
      sx: block.halfX * 2 + SIDEWALK_WIDTH * 2,
      sz: CURB_WIDTH,
    },
    // oeste
    {
      x: block.cx - (block.halfX + SIDEWALK_WIDTH + CURB_WIDTH / 2),
      z: block.cz,
      sx: CURB_WIDTH,
      sz: block.halfZ * 2 + SIDEWALK_WIDTH * 2,
    },
    // este
    {
      x: block.cx + (block.halfX + SIDEWALK_WIDTH + CURB_WIDTH / 2),
      z: block.cz,
      sx: CURB_WIDTH,
      sz: block.halfZ * 2 + SIDEWALK_WIDTH * 2,
    },
  ];

  for (const seg of segments) {
    const mesh = new THREE.Mesh(box, mats.curb);
    mesh.position.set(seg.x, y, seg.z);
    mesh.scale.set(seg.sx, CURB_HEIGHT, seg.sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

function addLaneMarkings(roadGroup, mats, geos) {
  const markGeo = new THREE.BoxGeometry(1, 1, 1);
  geos.push(markGeo);
  const transforms = [];

  for (const x of STREET_XS) {
    for (let z = STREET_ZS[0] + 1.2; z <= STREET_ZS[STREET_ZS.length - 1] - 1.2; z += 1.55) {
      // evitar centros de intersección
      if (STREET_ZS.some((sz) => Math.abs(sz - z) < ROAD_WIDTH * 0.65)) continue;
      transforms.push({ x, y: 0.035, z, sx: 0.12, sy: 0.02, sz: 0.55 });
    }
  }
  for (const z of STREET_ZS) {
    for (let x = STREET_XS[0] + 1.2; x <= STREET_XS[STREET_XS.length - 1] - 1.2; x += 1.55) {
      if (STREET_XS.some((sx) => Math.abs(sx - x) < ROAD_WIDTH * 0.65)) continue;
      transforms.push({ x, y: 0.036, z, sx: 0.55, sy: 0.02, sz: 0.12 });
    }
  }

  if (!transforms.length) return;
  const mesh = new THREE.InstancedMesh(markGeo, mats.marking, transforms.length);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  for (let i = 0; i < transforms.length; i += 1) {
    const t = transforms[i];
    _position.set(t.x, t.y, t.z);
    _quaternion.identity();
    _scale.set(t.sx, t.sy, t.sz);
    _matrix.compose(_position, _quaternion, _scale);
    mesh.setMatrixAt(i, _matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  roadGroup.add(mesh);
}

function addCrosswalks(roadGroup, mats, geos) {
  const plank = new THREE.BoxGeometry(1, 1, 1);
  geos.push(plank);
  const transforms = [];

  for (const x of STREET_XS) {
    for (const z of STREET_ZS) {
      // franjas en cruce, eje X (paso E–O sobre calle N–S)
      for (let i = -2; i <= 2; i += 1) {
        transforms.push({
          x: x + i * 0.28,
          y: 0.038,
          z: z + ROAD_WIDTH * 0.38,
          sx: 0.16,
          sy: 0.018,
          sz: 0.85,
        });
        transforms.push({
          x: x + i * 0.28,
          y: 0.038,
          z: z - ROAD_WIDTH * 0.38,
          sx: 0.16,
          sy: 0.018,
          sz: 0.85,
        });
      }
    }
  }

  const mesh = new THREE.InstancedMesh(plank, mats.crosswalk, transforms.length);
  for (let i = 0; i < transforms.length; i += 1) {
    const t = transforms[i];
    _position.set(t.x, t.y, t.z);
    _euler.set(0, 0, 0);
    _quaternion.setFromEuler(_euler);
    _scale.set(t.sx, t.sy, t.sz);
    _matrix.compose(_position, _quaternion, _scale);
    mesh.setMatrixAt(i, _matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  roadGroup.add(mesh);
}
