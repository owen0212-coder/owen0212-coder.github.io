// One physical press owns one action, even if the game phase changes mid-press.
export function bindFishingInput(button, {
  getPhase, isPaused, isHelpOpen, activate, setHolding, togglePause,
}, target = window) {
  const keys = new Set();
  let pointer = null;
  const bindings = [];
  const listen = (element, type, fn) => {
    element.addEventListener(type, fn);
    bindings.push(() => element.removeEventListener(type, fn));
  };
  const syncHolding = () => setHolding(
    (pointer !== null || keys.size > 0) && getPhase() === 'fighting' && !isPaused(),
  );
  const press = () => {
    if (getPhase() === 'fighting' && !isPaused()) setHolding(true);
    else activate();
  };
  const cancel = () => {
    pointer = null;
    keys.clear();
    setHolding(false);
  };
  listen(button, 'pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || pointer !== null || button.disabled || isHelpOpen()) return;
    event.preventDefault();
    pointer = event.pointerId;
    button.setPointerCapture?.(pointer);
    press();
  });
  const releasePointer = event => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    syncHolding();
  };
  listen(target, 'pointerup', releasePointer);
  listen(target, 'pointercancel', releasePointer);
  listen(button, 'lostpointercapture', releasePointer);
  listen(button, 'click', event => {
    // Pointer presses are handled on down; releasing them must never cast.
    // A zero-detail click still supports assistive-technology activation.
    if (event.detail > 0) { event.preventDefault(); return; }
    if (!button.disabled && !isHelpOpen() && keys.size === 0 && pointer === null) activate();
  });
  listen(target, 'keydown', event => {
    if (isHelpOpen()) return;
    if (event.code === 'KeyP' && !event.repeat) {
      if (['waiting', 'bite', 'fighting'].includes(getPhase())) {
        setHolding(false);
        togglePause();
      }
      return;
    }
    const onButton = event.target === button || button.contains(event.target);
    const space = event.code === 'Space';
    const enter = event.code === 'Enter' && onButton;
    if (!space && !enter) return;
    if (!onButton && event.target?.closest?.('button,a,input,textarea,select,dialog,[contenteditable="true"]')) return;
    // Also suppress native repeat/keyup clicks after fighting becomes caught.
    event.preventDefault();
    if (event.repeat || keys.has(event.code) || button.disabled) return;
    keys.add(event.code);
    press();
  });
  listen(target, 'keyup', event => {
    const tracked = keys.delete(event.code);
    const onButton = event.target === button || button.contains(event.target);
    if (tracked || (onButton && ['Space', 'Enter'].includes(event.code))) event.preventDefault();
    if (tracked) syncHolding();
  });
  listen(target, 'blur', cancel);
  return { cancel, dispose() { cancel(); bindings.forEach(remove => remove()); } };
}
