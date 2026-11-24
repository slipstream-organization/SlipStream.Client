import * as THREE from 'three';

/**
 * The "ghost" skin: a fresnel rim (bright where the surface turns away), scan lines that crawl
 * upwards, additive blending, no depth writes — a blue hologram of the other lap.
 */
export function makeHologram(color = '#3aa0ff') {
  const c = new THREE.Color(color);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Vector3(c.r, c.g, c.b) } },
    vertexShader: /* glsl */ `
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying float vWorldY;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        vWorldY = (modelMatrix * vec4(position, 1.0)).y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying float vWorldY;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 2.2);
        float scan = 0.62 + 0.38 * sin(vWorldY * 58.0 - uTime * 5.0);
        float rim = 0.22 + fres * 1.7;
        gl_FragColor = vec4(uColor * rim * 1.9 * scan, (0.16 + fres * 0.75) * scan);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  return { material, setTime: (t: number) => { material.uniforms.uTime.value = t; } };
}
