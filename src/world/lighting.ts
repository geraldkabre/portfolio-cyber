import * as THREE from 'three';
import { ATMOSPHERE } from './atmosphere';
import { PALETTE } from './palette';

/**
 * Night lighting: moon key light (north-west, shadows), cool fill from the south-east (the facades seen from the
 * arrival pad), navy/violet hemisphere, exponential fog matched to the sky horizon, and a procedural environment
 * map (dark navy dome + cyan/violet light strips) so the metal kit has something to reflect.
 */
export function createLighting(renderer: THREE.WebGLRenderer, scene: THREE.Scene, shadowMapSize: number) {
  const group = new THREE.Group();
  group.name = 'lighting';

  const hemi = new THREE.HemisphereLight('#4363b4', '#170d2c', 1.05);
  group.add(hemi);

  const moon = new THREE.DirectionalLight('#b4c8ff', 1.2);
  moon.position.copy(ATMOSPHERE.moonDir).multiplyScalar(90);
  moon.target.position.set(0, 0, 0);
  moon.castShadow = shadowMapSize > 0;
  moon.shadow.mapSize.set(shadowMapSize || 1024, shadowMapSize || 1024);
  const cam = moon.shadow.camera;
  // Static shadow map: the moon and the architecture never move, so the map covers the whole island and is
  // rendered once (renderer.shadowMap.autoUpdate = false). Characters use a soft contact shadow instead.
  cam.left = -35; cam.right = 35; cam.top = 35; cam.bottom = -35; cam.near = 40; cam.far = 150;
  moon.shadow.bias = -0.00035;
  moon.shadow.normalBias = 0.035;
  group.add(moon, moon.target);

  const fill = new THREE.DirectionalLight('#4a7dff', 0.8);
  fill.position.set(50, 28, 70);
  group.add(fill);

  scene.fog = new THREE.FogExp2(ATMOSPHERE.horizon.clone(), ATMOSPHERE.fogDensity);
  scene.background = ATMOSPHERE.horizon.clone();

  // Procedural environment for reflections.
  const env = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){
      vec3 d = normalize(vP); float h = d.y;
      vec3 top = vec3(0.010, 0.018, 0.050); vec3 hor = vec3(0.045, 0.060, 0.150); vec3 bot = vec3(0.006, 0.006, 0.016);
      vec3 c = h > 0.0 ? mix(hor, top, smoothstep(0.0, 0.7, h)) : mix(hor, bot, smoothstep(0.0, -0.4, h));
      c += vec3(0.10, 0.05, 0.30) * exp(-abs(h - 0.04) * 20.0) * 0.6;
      gl_FragColor = vec4(c, 1.0); }`,
  }));
  env.add(dome);
  const strip = (color: string, intensity: number, w: number, h: number, pos: THREE.Vector3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  strip(PALETTE.cyan, 1.4, 30, 1.2, new THREE.Vector3(0, 14, -40));
  strip(PALETTE.eblue, 1.0, 40, 2.0, new THREE.Vector3(38, 6, 10));
  strip(PALETTE.violet, 0.9, 30, 1.6, new THREE.Vector3(-36, 8, 20));
  strip('#cfe6ff', 1.6, 8, 8, ATMOSPHERE.moonDir.clone().multiplyScalar(45));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.85;

  return { group, moon, fill, hemi };
}
