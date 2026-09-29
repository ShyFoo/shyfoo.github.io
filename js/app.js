(() => {
  'use strict';
  const tabs = Array.from(document.querySelectorAll('[data-view]'));
  const views = Array.from(document.querySelectorAll('.view'));
  const validViews = tabs.map(tab => tab.dataset.view);
  function setView(name, updateHash = true, moveFocus = false) {
    const aliases = {research:'publications', papers:'publications', news:'about', services:'service'};
    name = aliases[name.toLowerCase()] || name.toLowerCase();
    if (!validViews.includes(name)) name = 'about';
    for (const tab of tabs) {
      const selected = tab.dataset.view === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const view of views) view.hidden = view.id !== `panel-${name}`;
    if (updateHash) history.replaceState(null, '', `#${name}`);
    if (moveFocus) document.querySelector(`[data-view="${name}"]`).focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setView(tab.dataset.view));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); setView(tabs[next].dataset.view, true, true);
    });
  });
  document.querySelectorAll('[data-open-view]').forEach(button => button.addEventListener('click', () => {
    setView(button.dataset.openView, true, true);
    document.querySelector('.topbar').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
  }));
  window.addEventListener('hashchange', () => setView(location.hash.slice(1), false));
  setView(location.hash.slice(1) || 'about', false);

  const dialog = document.getElementById('details-dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogBody = document.getElementById('dialog-body');
  let lastFocused = null;
  function openDialog(title, body, eyebrow = '') {
    lastFocused = document.activeElement;
    dialogTitle.textContent = title; dialogBody.innerHTML = body;
    const label = document.getElementById('dialog-eyebrow');
    label.textContent = eyebrow;
    label.hidden = !eyebrow;
    dialog.classList.toggle('is-email', title === 'Email');
    dialog.showModal();
  }
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (lastFocused && lastFocused.isConnected) lastFocused.focus(); });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  document.getElementById('email-contact').addEventListener('click', () => {
    openDialog('Email', '<a class="email-address" href="mailto:fus.jayce@gmail.com">fus.jayce@gmail.com</a>');
  });

  const robot = document.getElementById('robot'), bubble = document.getElementById('robot-bubble'), echo = document.getElementById('robot-echo');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let shy = false, appearances = 0, mouse = {x:-1000,y:-1000};
  let robotPosition = null;
  const recentRobotPositions = [];
  function getRobotPositions() {
    const width = robot.offsetWidth, height = robot.offsetHeight;
    const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
    const shell = document.querySelector('.site-shell').getBoundingClientRect();
    const bottom = Math.max(8, viewportHeight - height - 20);
    const top = Math.min(48, bottom);
    const levels = Math.min(5, Math.max(1, Math.floor((bottom - top) / (height + 16)) + 1));
    const positions = [];
    for (const side of ['left', 'right']) {
      const gutter = side === 'left' ? shell.left : viewportWidth - shell.right;
      if (gutter < width + 12) continue;
      const inset = Math.min(24, (gutter - width) / 2);
      for (let level = 0; level < levels; level++) {
        positions.push({
          id: `${side}-${level}`,
          x: side === 'left' ? inset : viewportWidth - width - inset,
          y: levels === 1 ? bottom : top + (bottom - top) * level / (levels - 1),
          bubbleWidth: Math.min(120, width + 2 * inset - 12)
        });
      }
    }
    // Tight layouts retain the small corner footprint instead of covering text.
    return positions.length ? positions : [
      {id:'left-bottom', x:8, y:bottom, bubbleWidth:width + 4},
      {id:'right-bottom', x:Math.max(8,viewportWidth-width-8), y:bottom, bubbleWidth:width + 4}
    ];
  }
  function placeRobot(point) {
    robotPosition = point;
    robot.style.right = 'auto'; robot.style.bottom = 'auto';
    robot.style.left = point.x + 'px'; robot.style.top = point.y + 'px';
    bubble.style.maxWidth = point.bubbleWidth + 'px';
  }
  function nextRobotPosition() {
    const positions = getRobotPositions();
    const width = robot.offsetWidth, height = robot.offsetHeight;
    const distanceToMouse = p => Math.hypot(p.x + width / 2 - mouse.x, p.y + height / 2 - mouse.y);
    const clear = positions.filter(p => distanceToMouse(p) >= 160);
    let choices = clear.length ? clear : [positions.reduce((best,p) => distanceToMouse(p) > distanceToMouse(best) ? p : best)];
    const different = choices.filter(p => !robotPosition || Math.hypot(p.x-robotPosition.x,p.y-robotPosition.y) >= height + 20);
    if (different.length) choices = different;
    const fresh = choices.filter(p => !recentRobotPositions.includes(p.id));
    if (fresh.length) choices = fresh;
    const newHeight = choices.filter(p => !robotPosition || Math.abs(p.y-robotPosition.y) >= height);
    if (newHeight.length) choices = newHeight;
    const point = choices[Math.floor(Math.random() * choices.length)];
    recentRobotPositions.push(point.id);
    if (recentRobotPositions.length > 3) recentRobotPositions.shift();
    return point;
  }
  const initialPositions = getRobotPositions();
  placeRobot(initialPositions[initialPositions.length - 1]);
  recentRobotPositions.push(robotPosition.id);
  document.addEventListener('pointermove', event => { mouse = {x:event.clientX,y:event.clientY}; }, {passive:true});
  function disappear() {
    if (shy || document.hidden) return;
    shy = true;
    const rect = robot.getBoundingClientRect();
    echo.style.left = (rect.left + rect.width / 2 - 12) + 'px'; echo.style.top = (rect.top + rect.height / 2) + 'px';
    echo.classList.remove('flash'); void echo.offsetWidth; echo.classList.add('flash');
    robot.classList.add('is-hidden'); robot.setAttribute('aria-hidden','true'); robot.tabIndex = -1;
    setTimeout(() => echo.classList.remove('flash'), 650);
    setTimeout(() => {
      appearances++;
      placeRobot(nextRobotPosition());
      bubble.textContent = ['still here.', 'you found me.', 'just curious.', 'oh, hello.'][appearances%4];
      robot.classList.remove('is-hidden'); robot.removeAttribute('aria-hidden'); robot.tabIndex = 0; shy = false;
    }, reduceMotion.matches ? 2800 : 2000);
  }
  robot.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') disappear(); });
  robot.addEventListener('click', disappear);
  window.addEventListener('resize', () => {
    const positions = getRobotPositions();
    const matching = positions.find(p => p.id === robotPosition.id);
    const distance = p => Math.hypot(p.x-robotPosition.x,p.y-robotPosition.y);
    placeRobot(matching || positions.reduce((best,p) => distance(p) < distance(best) ? p : best));
  });
})();
