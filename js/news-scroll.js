(() => {
  'use strict';
  const viewport = document.getElementById('news-scroll');
  const list = document.getElementById('news-list');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const SPEED = 14;
  let hovered = matchMedia('(hover: hover)').matches && viewport.matches(':hover');
  let keyboardFocus = false, dragging = false, visible = false;
  let frame = 0, timer = 0, lastTime = 0, position = 0, manualUntil = 0;

  function limit() { return Math.max(0, viewport.scrollHeight - viewport.clientHeight); }
  function canRun() {
    return !reducedMotion.matches && !hovered && !keyboardFocus && !dragging && visible && !document.hidden && viewport.clientHeight > 0 && limit() > 1;
  }
  function stop() {
    cancelAnimationFrame(frame); clearTimeout(timer);
    frame = 0; timer = 0; lastTime = 0;
  }
  function wake(delay = 0) {
    stop();
    if (!canRun()) return;
    timer = setTimeout(() => {
      timer = 0;
      if (!canRun()) return;
      // Resume from the reader's native scrollbar position after manual browsing.
      position = viewport.scrollTop;
      frame = requestAnimationFrame(tick);
    }, Math.max(delay, manualUntil - performance.now(), 0));
  }
  function tick(now) {
    frame = 0;
    if (!canRun()) {lastTime = 0; return;}
    const bottom = limit();
    if (position >= bottom - .5) {
      // Pause at the end before restarting the native scroll area.
      timer = setTimeout(() => {
        timer = 0;
        if (!canRun()) return;
        viewport.scrollTop = 0;
        wake(1200);
      }, 2500);
      return;
    }
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now;
    position = Math.min(bottom, position + SPEED * delta);
    viewport.scrollTop = position;
    frame = requestAnimationFrame(tick);
  }

  viewport.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true; stop();
  });
  viewport.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return;
    hovered = false; wake(250);
  });
  viewport.addEventListener('pointerdown', () => {
    keyboardFocus = false; dragging = true; stop();
  }, {passive:true});
  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    manualUntil = performance.now() + (event.pointerType === 'touch' ? 3000 : 400);
    wake();
  }
  window.addEventListener('pointerup', endDrag, {passive:true});
  window.addEventListener('pointercancel', endDrag, {passive:true});
  viewport.addEventListener('wheel', () => {
    manualUntil = performance.now() + 1000;
    wake();
  }, {passive:true});
  viewport.addEventListener('focusin', event => {
    keyboardFocus = event.target.matches(':focus-visible');
    if (keyboardFocus) stop();
  });
  viewport.addEventListener('keydown', () => {keyboardFocus = true; stop();});
  viewport.addEventListener('focusout', () => {
    queueMicrotask(() => {
      if (!viewport.contains(document.activeElement)) {keyboardFocus = false; wake(400);}
    });
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : wake(800));
  window.addEventListener('blur', () => {dragging = false; stop();});
  window.addEventListener('focus', () => {
    hovered = matchMedia('(hover: hover)').matches && viewport.matches(':hover');
    wake(800);
  });
  reducedMotion.addEventListener('change', () => wake());
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) wake(1200); else stop();
  }).observe(viewport);
  const resize = new ResizeObserver(() => wake(800));
  resize.observe(viewport); resize.observe(list);
})();
