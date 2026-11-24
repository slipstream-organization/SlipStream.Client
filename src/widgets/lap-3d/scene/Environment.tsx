import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { TrackBundle } from '../data/loadTrack';
import { buildEnvironment } from './buildings';
import type { WorldGeometry } from './geometry';
import { facadeTextures, sphereTexture } from './textures';

/** Buildings around the circuit (OpenStreetMap): two merged meshes, windows lit by an emissive map. */
export function Environment({ bundle, world }: { bundle: TrackBundle; world: WorldGeometry }) {
  const env = bundle.environment;
  const built = useMemo(() => (env ? buildEnvironment(env, world.groundAt) : null), [env, world]);
  const tex = useMemo(() => {
    const t = facadeTextures();
    const sphere = sphereTexture();
    return { ...t, sphere };
  }, []);
  const beacons = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!built || !beacons.current) return;
    const o = new THREE.Object3D();
    built.beacons.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.updateMatrix();
      beacons.current!.setMatrixAt(i, o.matrix);
    });
    beacons.current.instanceMatrix.needsUpdate = true;
  }, [built]);

  if (!env || !built) return null;
  return (
    <group>
      <mesh geometry={built.walls}>
        <meshStandardMaterial map={tex.map} emissiveMap={tex.emissive} emissive="#ffffff" emissiveIntensity={1.9} vertexColors roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh geometry={built.roofs}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {built.beacons.length > 0 && (
        <instancedMesh ref={beacons} args={[undefined, undefined, built.beacons.length]} frustumCulled={false}>
          <sphereGeometry args={[1.6, 8, 6]} />
          <meshBasicMaterial color={[3, 0.15, 0.1]} toneMapped={false} />
        </instancedMesh>
      )}
      {env.landmarks.map((l) => {
        const x = l.x, z = -l.y;
        const R = Math.max(40, l.radius);
        const gy = world.groundAt(x, z);
        return (
          <mesh key={l.name} position={[x, gy + R * 0.78, z]}>
            <sphereGeometry args={[R, 48, 32]} />
            <meshBasicMaterial map={tex.sphere} color={[1.7, 1.7, 1.7]} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}
