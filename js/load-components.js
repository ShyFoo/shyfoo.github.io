const slots = [...document.querySelectorAll('[data-component]')];

try {
  await Promise.all(slots.map(async slot => {
    const response = await fetch(slot.dataset.component, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`Could not load ${slot.dataset.component}: ${response.status}`);
    slot.innerHTML = await response.text();
  }));

  // Bind interactions only after every editable HTML section is present.
  await import('./app.js');
  const enhancements = await Promise.allSettled([
    import('./news-scroll.js'),
    import('./toybox.js')
  ]);
  for (const result of enhancements) {
    if (result.status === 'rejected') console.error('An optional interaction could not start.', result.reason);
  }
} catch (error) {
  console.error(error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'margin:24px;font:16px/1.6 sans-serif';
  message.textContent = 'Some page content could not be loaded. Please reload this page.';
  document.body.prepend(message);
}
