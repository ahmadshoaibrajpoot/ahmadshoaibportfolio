/* Cursor effects for the landing page:
 *  - a soft light in the page background that follows the pointer (--mx / --my on <html>)
 *  - a trailing ring + dot that grows over links, buttons and cards
 * Mouse users only; touch devices keep the normal behaviour. */
(function () {
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  var ring = document.createElement('div');
  ring.className = 'cur-ring';
  ring.setAttribute('aria-hidden', 'true');
  var dot = document.createElement('div');
  dot.className = 'cur-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);
  document.body.appendChild(dot);

  var HOVER = 'a, button, summary, [role="tab"], .lp-card, .rec-card, input, label, select, textarea';
  var mx = -100, my = -100, rx = -100, ry = -100, seen = false, raf = 0;

  function loop() {
    // the ring eases toward the pointer; the dot sits right on it
    rx += (mx - rx) * (still ? 1 : 0.18);
    ry += (my - ry) * (still ? 1 : 0.18);
    ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) raf = requestAnimationFrame(loop);
    else raf = 0;
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    root.style.setProperty('--mx', mx + 'px');
    root.style.setProperty('--my', my + 'px');
    if (!seen) { seen = true; rx = mx; ry = my; ring.classList.add('on'); dot.classList.add('on'); }
    var t = e.target && e.target.closest ? e.target : null;
    var hov = !!(t && t.closest(HOVER));
    // live-work previews draw their own "Visit" cursor, so step aside there
    var own = !!(t && t.closest('.lp-shot'));
    ring.classList.toggle('hov', hov && !own);
    ring.classList.toggle('hide', own);
    dot.classList.toggle('hide', own);
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  document.addEventListener('pointerdown', function () { ring.classList.add('down'); });
  document.addEventListener('pointerup', function () { ring.classList.remove('down'); });
  document.documentElement.addEventListener('mouseleave', function () {
    ring.classList.remove('on'); dot.classList.remove('on'); seen = false;
  });
})();
