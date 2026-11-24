import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { TrackBundle } from '../data/loadTrack';
import type { QualitySpec } from '../quality';
import { buildWorld } from './geometry';
import { Environment } from './Environment';
import { asphaltTexture, fenceTexture, kerbTexture, poolTexture } from './textures';

const POLE_H = 13;

/** The static night track: a few merged meshes plus instanced lamps. */
export function TrackWorld({ bundle, quality }: { bundle: TrackBundle; quality: QualitySpec }) {
  const world = useMemo(() => buildWorld(bundle, quality), [bundle, quality]);
  const tex = useMemo(() => {
    const fence = fenceTexture();
    fence.repeat.set(1, 2.7);
    return { asphalt: asphaltTexture(), kerb: kerbTexture(), fence, pool: poolTexture() };
  }, []);

  const lamps = world.lamps;
  const poles = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const pools = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    lamps.forEach((l, i) => {
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.position.set(l.x, l.y + POLE_H / 2 - 1, l.z);
      o.updateMatrix();
      poles.current!.setMatrixAt(i, o.matrix);

      // the head reaches towards the track
      const dx = Math.sin(l.rot), dz = Math.cos(l.rot);
      o.position.set(l.x + dx * 2.2, l.y + POLE_H - 0.6, l.z + dz * 2.2);
      o.rotation.set(0, l.rot, 0);
      o.updateMatrix();
      heads.current!.setMatrixAt(i, o.matrix);

      // light pool on the road
      o.position.set(l.x + (l.sx - l.x) * 0.82, l.y + 0.09, l.z + (l.sz - l.z) * 0.82);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.updateMatrix();
      pools.current!.setMatrixAt(i, o.matrix);
    });
    for (const r of [poles, heads, pools]) r.current!.instanceMatrix.needsUpdate = true;
  }, [lamps]);

  const s = world.start;
  const half = bundle.config.width / 2;

  return (
    <group>
      <Environment bundle={bundle} world={world} />
      <mesh geometry={world.ground}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={world.asphalt}>
        <meshStandardMaterial map={tex.asphalt} roughness={0.88} metalness={0.05} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <mesh geometry={world.pit}>
        <meshStandardMaterial vertexColors color="#5a5d66" roughness={0.9} />
      </mesh>
      <mesh geometry={world.lines}>
        <meshStandardMaterial vertexColors roughness={0.7} emissive="#ffffff" emissiveIntensity={0.18} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={world.kerbs}>
        <meshStandardMaterial map={tex.kerb} roughness={0.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh geometry={world.concrete}>
        <meshStandardMaterial vertexColors roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={world.led}>
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {world.glow && (
        <mesh geometry={world.glow} renderOrder={2}>
          <meshBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {world.fence && (
        <mesh geometry={world.fence}>
          <meshStandardMaterial vertexColors alphaMap={tex.fence} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      )}

      {/* lamp posts */}
      <instancedMesh ref={poles} args={[undefined, undefined, lamps.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.13, 0.2, POLE_H, 6]} />
        <meshStandardMaterial color="#2a2d34" roughness={0.7} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, lamps.length]} frustumCulled={false}>
        <boxGeometry args={[0.5, 0.16, 2.6]} />
        <meshBasicMaterial color={[3.2, 2.7, 2]} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[undefined, undefined, lamps.length]} frustumCulled={false} renderOrder={1}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial map={tex.pool} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.55} toneMapped={false} />
      </instancedMesh>

      {/* start / finish gantry */}
      <group position={[s.x, s.y, s.z]} rotation={[0, s.heading, 0]}>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * (half + 2.2), 4.6, 0]}>
            <boxGeometry args={[0.7, 9.2, 0.9]} />
            <meshStandardMaterial color="#1c1e24" roughness={0.6} metalness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 9.2, 0]}>
          <boxGeometry args={[(half + 2.2) * 2 + 0.7, 1.1, 1.1]} />
          <meshStandardMaterial color="#1c1e24" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 9.2, -0.6]}>
          <boxGeometry args={[(half + 2.2) * 2, 0.5, 0.1]} />
          <meshBasicMaterial color={[2.4, 0.2, 1.4]} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
