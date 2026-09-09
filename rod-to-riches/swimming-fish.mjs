import * as T from './vendor/three.module.min.js';

export function createSwimmingFish() {
  const fish = new T.Group();
  fish.name = 'underwater-fish';
  // Unlit silhouettes avoid tiny self-shadow artifacts beneath the water.
  const material = new T.MeshBasicMaterial({ color: '#326567' });
  const body = new T.Mesh(new T.SphereGeometry(.35, 12, 8), material);
  body.scale.set(.4, .16, 1);
  const tail = new T.Mesh(new T.ConeGeometry(.18, .32, 3), material);
  tail.rotation.x = Math.PI / 2;
  tail.scale.y = -1;
  tail.position.z = .4;
  fish.add(body, tail);
  // The entire fish stays below the lowest wave (-0.09), including its tail.
  fish.position.y = -.45;
  return fish;
}
