import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  asphaltTexture,
  barrierPieces,
  fenceGeometry,
  fenceTexture,
  garagePieces,
  grassTexture,
  instancedBoxes,
  kerbPieces,
  landmarkPieces,
  pitLaneGeometry,
  runoffGeometry,
  slabGeometry,
  standPieces,
  terrainGeometry,
  type WorldBase,
} from './worldGeometry';

/** Theme colours the world needs (resolved CSS vars, see --scene-* in index.css). */
export interface WorldPalette {
  asphalt: string;
  asphaltSide: string;
  line: string;
  kerbRed: string;
  kerbWhite: string;
  grass: string;
  grass2: string;
  runoff: string;
  runoffTarmac: string;
  pitlane: string;
  barrier: string;
  tecpro: string;
  boardA: string;
  boardB: string;
  fence: string;
  building: string;
  roof: string;
  seatA: string;
  seatB: string;
  lamp: string;
}

/**
 * Static scenery for one layout. `detail` = false (map view) keeps only terrain, asphalt, run-off
 * and kerbs, so the overview stays readable and cheap.
 */
export function TrackWorld({ base, detail, C }: { base: WorldBase; detail: boolean; C: WorldPalette }) {
  const col = useMemo(() => {
    const c = (v: string) => new THREE.Color(v);
    return {
      asphalt: c(C.asphalt), side: c(C.asphaltSide), line: c(C.line), red: c(C.kerbRed), white: c(C.kerbWhite),
      grassA: c(C.grass), grassB: c(C.grass2), gravel: c(C.runoff), tarmac: c(C.runoffTarmac), barrier: c(C.barrier),
      tecpro: c(C.tecpro), boards: [c(C.boardA), c(C.boardB)], building: c(C.building), roof: c(C.roof),
      seatA: c(C.seatA), seatB: c(C.seatB), lamp: c(C.lamp),
    };
  }, [C]);

  const tex = useMemo(() => ({ grain: asphaltTexture(), grass: grassTexture(), fence: fenceTexture() }), []);
  useEffect(() => () => Object.values(tex).forEach((t) => t.dispose()), [tex]);

  // geometry depends on layout + colours (vertex / instance colours), never on time
  const slab = useMemo(() => slabGeometry(base, col.asphalt, col.line, col.side), [base, col]);
  const terrain = useMemo(() => terrainGeometry(base, col.grassA, col.grassB), [base, col]);
  const runoff = useMemo(() => runoffGeometry(base, col.gravel, col.tarmac), [base, col]);
  const pitLane = useMemo(() => pitLaneGeometry(base), [base]);
  const barrierList = useMemo(() => (detail ? barrierPieces(base, col.barrier, col.tecpro, col.white, col.boards) : []), [base, col, detail]);
  const fence = useMemo(() => (detail ? fenceGeometry(barrierList) : null), [barrierList, detail]);
  useEffect(() => () => slab.dispose(), [slab]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(() => () => runoff.dispose(), [runoff]);
  useEffect(() => () => pitLane.dispose(), [pitLane]);
  useEffect(() => () => fence?.dispose(), [fence]);

  // shared materials (colour comes from instance colours)
  const mats = useMemo(
    () => ({
      solid: new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 }),
      kerb: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const kerbs = useMemo(() => instancedBoxes(kerbPieces(base, col.red, col.white), mats.kerb, false), [base, col, mats]);
  const barriers = useMemo(() => (barrierList.length ? instancedBoxes(barrierList, mats.solid, false) : null), [barrierList, mats]);
  const buildings = useMemo(
    () => (detail ? instancedBoxes([...garagePieces(base, col.building, col.roof), ...standPieces(base, col.seatA, col.seatB, col.roof)], mats.solid) : null),
    [base, col, mats, detail],
  );
  const landmarks = useMemo(() => (detail ? instancedBoxes(landmarkPieces(base, col.building, col.roof, col.lamp), mats.solid) : null), [base, col, mats, detail]);
  useEffect(
    () => () => {
      [kerbs, barriers, buildings, landmarks].forEach((m) => {
        if (!m) return;
        m.geometry.dispose();
        m.dispose();
      });
    },
    [kerbs, barriers, buildings, landmarks],
  );

  return (
    <group>
      <mesh geometry={terrain} receiveShadow>
        <meshStandardMaterial vertexColors map={tex.grass} roughness={0.95} metalness={0} />
      </mesh>
      {/* asphalt: fine grain + a little specular so it catches the light like the broadcast look */}
      <mesh geometry={slab} receiveShadow>
        <meshStandardMaterial vertexColors map={tex.grain} roughness={0.62} metalness={0.02} />
      </mesh>
      <mesh geometry={runoff} receiveShadow>
        <meshStandardMaterial vertexColors map={tex.grain} roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <primitive object={kerbs} />
      {detail && (
        <>
          <mesh geometry={pitLane} receiveShadow>
            <meshStandardMaterial color={C.pitlane} map={tex.grain} roughness={0.75} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
          {barriers && <primitive object={barriers} />}
          {fence && (
            <mesh geometry={fence} renderOrder={5}>
              <meshStandardMaterial color={C.fence} map={tex.fence} transparent alphaTest={0.08} depthWrite={false} side={THREE.DoubleSide} roughness={0.7} metalness={0.3} />
            </mesh>
          )}
          {buildings && <primitive object={buildings} />}
          {landmarks && <primitive object={landmarks} />}
        </>
      )}
    </group>
  );
}
