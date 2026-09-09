import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from './vendor/three.module.min.js';
import {createSwimmingFish,animateSwimmingFish} from './swimming-fish.mjs';
import {bindFishingInput} from './fishing-input.mjs';

class Surface {
  listeners = new Map();
  disabled = false;
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(f => f !== fn)); }
  contains(node) { return node === this; }
  closest() { return null; }
  setPointerCapture() {}
  emit(type, values = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const fn of this.listeners.get(type) || []) fn(event);
    return event;
  }
}
function setup() {
  const button = new Surface(), target = new Surface();
  const state = { phase: 'fighting', holding: false, activations: 0, paused: false, help: false };
  const input = bindFishingInput(button, { getPhase: () => state.phase, isPaused: () => state.paused,
    isHelpOpen: () => state.help, activate: () => { state.activations++; },
    setHolding: value => { state.holding = value; }, togglePause: () => { state.paused = !state.paused; },
  }, target);
  return {button, target, state, input};
}
for (const endPhase of ['caught', 'lost']) {
  test(`pointer release after ${endPhase} does not cast; next press casts exactly once`, () => {
    const {button, target, state} = setup();
    button.emit('pointerdown', {button: 0, pointerId: 7}); assert.equal(state.holding, true);
    state.phase = endPhase; state.holding = false;
    target.emit('pointerup', {pointerId: 7}); button.emit('click', {detail: 1});
    assert.equal(state.activations, 0);
    button.emit('pointerdown', {button: 0, pointerId: 8});
    target.emit('pointerup', {pointerId: 8}); button.emit('click', {detail: 1});
    assert.equal(state.activations, 1);
  });
}
for (const focused of [true, false]) {
  test(`held Space after landing cannot recast (${focused ? 'button focused' : 'global shortcut'})`, () => {
    const {button, target, state} = setup();
    const key = {code: 'Space', target: focused ? button : target, repeat: false};
    assert.equal(target.emit('keydown', key).defaultPrevented, true);
    assert.equal(state.holding, true); state.phase = 'caught'; state.holding = false;
    for (let i = 0; i < 20; i++) assert.equal(target.emit('keydown', {...key, repeat: true}).defaultPrevented, true);
    // Native buttons synthesize clicks unless keyboard activation is prevented.
    const release = target.emit('keyup', key);
    if (!release.defaultPrevented) button.emit('click', {detail: 0});
    assert.equal(state.activations, 0);
    target.emit('keydown', key); assert.equal(state.activations, 1);
    assert.equal(target.emit('keyup', key).defaultPrevented, true);
  });
}
test('Enter is consumed through a phase transition, and assistive clicks remain usable', () => {
  const {button, target, state} = setup();
  target.emit('keydown', {code: 'Enter', target: button}); state.phase = 'caught';
  assert.equal(target.emit('keydown', {code: 'Enter', target: button, repeat: true}).defaultPrevented, true);
  assert.equal(target.emit('keyup', {code: 'Enter', target: button}).defaultPrevented, true);
  assert.equal(state.activations, 0); button.emit('click', {detail: 0}); assert.equal(state.activations, 1);
});
test('pointer cancellation and blur release the reel without casting', () => {
  const {button, target, state} = setup();
  button.emit('pointerdown', {button: 0, pointerId: 4});
  target.emit('pointercancel', {pointerId: 4}); assert.equal(state.holding, false);
  button.emit('pointerdown', {button: 0, pointerId: 5});
  target.emit('blur'); assert.equal(state.holding, false); assert.equal(state.activations, 0);
});
test('disabled controls, other inputs, and help dialogs do not trigger casts', () => {
  const {button, target, state} = setup(); state.phase = 'waiting'; button.disabled = true;
  target.emit('keydown', {code: 'Space', target: button});
  button.emit('pointerdown', {button: 0, pointerId: 1}); assert.equal(state.activations, 0);
  button.disabled = false; state.help = true; target.emit('keydown', {code: 'Space', target: button});
  assert.equal(state.activations, 0); state.help = false;
  const elsewhere = {closest: () => ({tagName: 'INPUT'})};
  assert.equal(target.emit('keydown', {code: 'Space', target: elsewhere}).defaultPrevented, false);
});
test('every fish and animated fin stays submerged, with faceted lighting but no shadow artifacts', () => {
  for (let index = 0; index < 10; index++) {
    const fish = createSwimmingFish(index);
    for (let i = 0; i < 96; i++) {
      animateSwimmingFish(fish, i * .73);
      fish.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(fish);
      assert.ok(bounds.max.y < -.09, `fish ${index} intersects surface at ${bounds.max.y}`);
    }
    fish.traverse(mesh => { if (mesh.isMesh) {
      assert.equal(mesh.castShadow, false); assert.equal(mesh.receiveShadow, false);
      assert.equal(mesh.material.isMeshStandardMaterial, true);
      assert.equal(mesh.material.flatShading, true);
    } });
  }
});
test('fish visibly travel in their facing direction and articulate their tails', () => {
  for (let index = 0; index < 10; index++) {
    const fish = createSwimmingFish(index);
    animateSwimmingFish(fish, 5);
    const start = fish.position.clone();
    const facing = new T.Vector3(0, 0, -1).applyEuler(fish.rotation);
    const tailAngle = fish.userData.swim.tail.rotation.y;
    animateSwimmingFish(fish, 5.01);
    const direction = fish.position.clone().sub(start); direction.y = 0;
    assert.ok(direction.normalize().dot(facing) > .999, 'fish must swim head-first');
    animateSwimmingFish(fish, 6);
    assert.ok(fish.position.distanceTo(start) > .35, 'movement must be visible within one second');
    assert.ok(Math.abs(fish.userData.swim.tail.rotation.y - tailAngle) > .01, 'tail must beat');
  }
});
test('swimming paths remain bounded and respect reduced motion', () => {
  const fish = createSwimmingFish(3);
  animateSwimmingFish(fish, 0, true);
  const start = fish.position.clone(), tail = fish.userData.swim.tail.rotation.y;
  animateSwimmingFish(fish, 100, true);
  assert.deepEqual(fish.position, start); assert.equal(fish.userData.swim.tail.rotation.y, tail);
  for (let t = 0; t <= 3600; t += 17) {
    animateSwimmingFish(fish, t);
    assert.ok(fish.position.x > -2 && fish.position.x < 16);
    assert.ok(fish.position.z > -2 && fish.position.z < 14);
  }
});
