/**
 * Loads car GLBs once, normalises them and hands out per-driver clones.
 *
 *  - GLTFLoader + MeshoptDecoder (our optimised files) + DRACOLoader (decoder in /draco/, only
 *    fetched when a Draco-compressed model shows up).
 *  - The prepared template is cached per URL; every car is a SkeletonUtils.clone with its own
 *    material copies, so recolouring one car never touches another.
 *  - Normalisation: rotate the nose to +X, scale the bounding box to REAL_CAR_LENGTH, wheels on y = 0.
 *  - Wheels: if the model has no separate wheel meshes, the tyre mesh is split into connected
 *    pieces and the four biggest become spinning wheels (pivot at their centre).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MATERIAL_ROLES, REAL_CAR_LENGTH, type CarModelSpec } from '../../shared/config/carModels';

type Role = 'primary' | 'secondary' | 'carbon' | 'tyre' | 'other';
const WHEEL = 'slipstream:wheel';

let loader: GLTFLoader | null = null;
function gltfLoader() {
  if (!loader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

const cache = new Map<string, Promise<THREE.Group>>();

function roleOf(url: string, material: THREE.Material): Role {
  const roles = MATERIAL_ROLES[url];
  if (!roles) return /tyre|tire|wheel/i.test(material.name) ? 'tyre' : /body|livery|paint/i.test(material.name) ? 'primary' : /wing/i.test(material.name) ? 'secondary' : 'other';
  for (const r of ['primary', 'secondary', 'carbon', 'tyre'] as const) if (roles[r].includes(material.name)) return r;
  return 'other';
}

/** Split a geometry into connected pieces (vertices welded by position). */
function components(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute('position');
  const index = geo.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  const vi = (t: number, c: number) => (index ? index.getX(t * 3 + c) : t * 3 + c);
  const key = (v: number) => `${pos.getX(v).toFixed(4)},${pos.getY(v).toFixed(4)},${pos.getZ(v).toFixed(4)}`;
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  for (let v = 0; v < pos.count; v++) if (!parent.has(key(v))) parent.set(key(v), key(v));
  for (let t = 0; t < triCount; t++) {
    const a = find(key(vi(t, 0)));
    for (let c = 1; c < 3; c++) {
      const b = find(key(vi(t, c)));
      if (a !== b) parent.set(b, a);
    }
  }
  const groups = new Map<string, number[]>();
  for (let t = 0; t < triCount; t++) {
    const r = find(key(vi(t, 0)));
    const g = groups.get(r);
    if (g) g.push(t);
    else groups.set(r, [t]);
  }
  return { tris: [...groups.values()], vi };
}

/** Non-indexed geometry from a list of triangles, translated by −centre. */
function subGeometry(src: THREE.BufferGeometry, tris: number[], vi: (t: number, c: number) => number, centre: THREE.Vector3) {
  const pos = src.getAttribute('position'), nor = src.getAttribute('normal');
  const p = new Float32Array(tris.length * 9), n = nor ? new Float32Array(tris.length * 9) : null;
  let o = 0;
  for (const t of tris)
    for (let c = 0; c < 3; c++, o += 3) {
      const v = vi(t, c);
      p[o] = pos.getX(v) - centre.x;
      p[o + 1] = pos.getY(v) - centre.y;
      p[o + 2] = pos.getZ(v) - centre.z;
      if (n && nor) {
        n[o] = nor.getX(v);
        n[o + 1] = nor.getY(v);
        n[o + 2] = nor.getZ(v);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  if (n) g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  else g.computeVertexNormals();
  return g;
}

/** Turn the tyre mesh's four biggest pieces into separate wheel meshes with a centred pivot. */
function extractWheels(mesh: THREE.Mesh) {
  const geo = mesh.geometry;
  const { tris, vi } = components(geo);
  if (tris.length < 4) return;
  const pos = geo.getAttribute('position');
  const boxOf = (list: number[]) => {
    const b = new THREE.Box3();
    const v = new THREE.Vector3();
    for (const t of list) for (let c = 0; c < 3; c++) b.expandByPoint(v.fromBufferAttribute(pos, vi(t, c)));
    return b;
  };
  const sorted = [...tris].sort((a, b) => b.length - a.length);
  const wheels = sorted.slice(0, 4);
  const rest = sorted.slice(4).flat();
  // four similar pieces → wheels; otherwise leave the model alone
  if (wheels[3].length < wheels[0].length * 0.6) return;

  for (const list of wheels) {
    const box = boxOf(list);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const axis = size.x <= size.y && size.x <= size.z ? 'x' : size.y <= size.z ? 'y' : 'z'; // thinnest side = axle
    const wheel = new THREE.Mesh(subGeometry(geo, list, vi, centre), mesh.material);
    wheel.name = WHEEL;
    wheel.position.copy(centre);
    wheel.userData.axis = axis;
    wheel.userData.role = 'tyre';
    wheel.castShadow = true;
    mesh.add(wheel);
  }
  const remaining = subGeometry(geo, rest, vi, new THREE.Vector3());
  mesh.geometry = remaining;
  geo.dispose();
}

/** Load + normalise once per URL. The result is a template: never add it to a scene directly. */
function template(spec: CarModelSpec): Promise<THREE.Group> {
  const hit = cache.get(spec.url);
  if (hit) return hit;
  const p = gltfLoader()
    .loadAsync(spec.url)
    .then((gltf) => {
      const model = gltf.scene;
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as THREE.Material;
        m.userData.role = roleOf(spec.url, mat);
      });
      // split tyres into wheels (collect first: extractWheels adds children)
      const tyres: THREE.Mesh[] = [];
      model.traverse((o) => (o as THREE.Mesh).isMesh && o.userData.role === 'tyre' && tyres.push(o as THREE.Mesh));
      if (!tyres.some((m) => /wheel/i.test(m.name))) tyres.forEach(extractWheels);

      // orientation → nose along +X, then scale to real length, wheels on the ground
      const root = new THREE.Group();
      const turn = new THREE.Group();
      turn.rotation.set(...spec.rotation);
      turn.add(model);
      root.add(turn);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const k = (REAL_CAR_LENGTH / (size.x || 1)) * spec.scale;
      turn.scale.setScalar(k);
      root.updateMatrixWorld(true);
      box.setFromObject(root);
      const c = box.getCenter(new THREE.Vector3());
      turn.position.set(-c.x, -box.min.y + spec.offsetY, -c.z);
      root.updateMatrixWorld(true);

      // per wheel: rolling direction and radius in car space
      const right = new THREE.Vector3(0, 0, 1); // car +X forward, +Y up → +Z is the right side
      const q = new THREE.Quaternion();
      root.traverse((o) => {
        if (o.name !== WHEEL) return;
        const axis = o.userData.axis as 'x' | 'y' | 'z';
        const local = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
        o.getWorldQuaternion(q);
        const dir = local.applyQuaternion(q);
        // rolling forward = negative rotation about the car's right axis
        o.userData.spin = -Math.sign(dir.dot(right) || 1);
        const wb = new THREE.Box3().setFromObject(o);
        o.userData.radius = Math.max(0.2, wb.getSize(new THREE.Vector3()).y / 2);
      });
      return root;
    });
  cache.set(spec.url, p);
  p.catch(() => cache.delete(spec.url)); // allow a retry after a failed load
  return p;
}

export interface CarInstance {
  object: THREE.Group;
  wheels: THREE.Object3D[];
  dispose: () => void;
}

/** A ready-to-add car in the team livery. `ghost` makes it slightly see-through (reference laps). */
export async function loadCar(spec: CarModelSpec, ghost = false): Promise<CarInstance> {
  const tpl = await template(spec);
  const object = cloneSkinned(tpl) as THREE.Group;
  const materials: THREE.Material[] = [];
  const wheels: THREE.Object3D[] = [];
  const own = new Map<THREE.Material, THREE.MeshStandardMaterial>(); // wheels share the tyre material
  object.traverse((o) => {
    if (o.name === WHEEL) wheels.push(o);
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.Material;
    let mat = own.get(src);
    if (!mat) {
      mat = (src as THREE.MeshStandardMaterial).clone();
      const role = m.userData.role as Role;
      if (role === 'primary') {
        mat.color.set(spec.livery.primary);
        mat.metalness = 0.45;
        mat.roughness = 0.32;
      } else if (role === 'secondary') {
        mat.color.set(spec.livery.secondary);
        mat.metalness = 0.35;
        mat.roughness = 0.38;
      } else if (role === 'carbon') {
        mat.metalness = 0.2;
        mat.roughness = 0.55;
      } else if (role === 'tyre') {
        mat.metalness = 0;
        mat.roughness = 0.9;
      }
      if (ghost) {
        mat.transparent = true;
        mat.opacity = 0.8;
        mat.depthWrite = false;
      }
      own.set(src, mat);
      materials.push(mat);
    }
    m.material = mat;
    m.castShadow = !ghost;
  });
  return { object, wheels, dispose: () => materials.forEach((m) => m.dispose()) };
}
