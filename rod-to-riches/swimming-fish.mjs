import * as T from './vendor/three.module.min.js';

export function createSwimmingFish(index = 0) {
  const fish = new T.Group();
  fish.name = 'underwater-fish';
  const colors = ['#407f83', '#6d9290', '#698d74', '#547e96'];
  // Keep the original faceted look, but never cast or receive tiny fish shadows.
  const material = new T.MeshStandardMaterial({color: colors[index % colors.length], roughness: .8, flatShading: true});
  const finMaterial = new T.MeshStandardMaterial({color: '#3b6971', roughness: .85, flatShading: true, side: T.DoubleSide});
  const body = new T.Mesh(new T.IcosahedronGeometry(.38, 1), material);
  body.scale.set(.55, .5, 1.45);
  const tail = new T.Group();
  tail.name = 'tail';
  tail.position.z = .42;
  const finGeometry = new T.BufferGeometry();
  // A forked, vertical tail attached at its narrow root.
  finGeometry.setAttribute('position', new T.Float32BufferAttribute([
    0,0,0, 0,.28,.46, 0,0,.31,
    0,0,0, 0,0,.31, 0,-.28,.46,
  ], 3));
  finGeometry.computeVertexNormals();
  tail.add(new T.Mesh(finGeometry, finMaterial));
  const fins = [];
  for (const side of [-1, 1]) {
    const fin = new T.Mesh(new T.ConeGeometry(.12, .3, 3), finMaterial);
    fin.position.set(side * .19, -.03, -.08);
    fin.rotation.z = side * Math.PI / 2;
    fin.rotation.y = side * .35;
    fin.scale.z = .25;
    fins.push(fin);
    fish.add(fin);
  }
  fish.add(body, tail);
  fish.scale.setScalar(.95 + (index % 3) * .12);
  fish.userData.swim = {index, body, tail, fins};
  animateSwimmingFish(fish, 0);
  return fish;
}

export function animateSwimmingFish(fish, time, reducedMotion = false) {
  const {index, body, tail, fins} = fish.userData.swim;
  const t = reducedMotion ? 0 : time;
  const speed = .18 + (index % 4) * .025;
  const angle = t * speed + index * 2.39996;
  const rx = 2.4 + (index % 3) * .6;
  const rz = 2 + (index % 4) * .4;
  // Continuous, bounded circuits through open water: no respawns or sideways slides.
  fish.position.set(
    2.5 + (index % 4) * 2.8 + Math.cos(angle) * rx,
    -.67 - (index % 3) * .07 + Math.sin(t * 1.3 + index) * .035,
    1.5 + Math.floor(index / 4) * 3.5 + Math.sin(angle) * rz,
  );
  const vx = -Math.sin(angle) * rx * speed;
  const vz = Math.cos(angle) * rz * speed;
  // The head points along -Z, so face the tangent of the swimming path.
  fish.rotation.y = Math.atan2(-vx, -vz);
  const beat = t * (7 + (index % 3)) + index * 1.7;
  body.rotation.y = Math.sin(beat) * .045;
  tail.rotation.y = Math.sin(beat - .6) * .48;
  fins.forEach((fin, i) => { fin.rotation.x = Math.sin(beat * .65 + i) * .18; });
}
