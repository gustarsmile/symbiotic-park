// People: small figures with big heads, dressed for their work, with a face you can read.
// Ported line by line from the prototype's drawing code.
const TAU = Math.PI * 2;
export function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
export function disc(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
export function oval(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
export function drawChar(c, L, st) {            // drawn standing on (0, 0); about 58 units tall
  const k = L.kid ? 0.8 : 1, sw = st.moving ? Math.sin(st.step) : 0, bh = st.sit ? 15 : 19, back = !!st.back, hold = back ? null : st.carry;
  c.save(); c.scale(k, k); c.lineCap = 'round';
  c.fillStyle = 'rgba(26,34,16,.28)'; oval(c, 0, 1, st.sit ? 11 : 13, 4.4);
  if (!st.sit) { c.fillStyle = L.boots || '#4a3a2c'; rr(c, -8.6 + sw * 2.4, -5.5, 7.6, 6.5, 2.8); c.fill(); rr(c, 1 - sw * 2.4, -5.5, 7.6, 6.5, 2.8); c.fill(); }
  c.translate(0, (st.sit ? -1 : -5) - (st.moving ? Math.abs(sw) * 1.6 : 0));
  if (st.bend) c.rotate((0.13 + Math.sin(st.t * 2.4 + st.ph) * 0.09) * st.dir);
  c.scale(st.dir, 1);
  if (L.extra === 'backpack' && !back) { c.fillStyle = L.packCol; rr(c, -12.5, -bh - 1, 25, 16, 5); c.fill(); }
  // the body, and what is worn over it
  c.fillStyle = L.top; rr(c, -10, -bh, 20, bh, 7); c.fill();
  if (back) {                              // from behind: crossed straps, an apron's tie, the back of a vest, a schoolbag
    if (L.over) { c.fillStyle = L.overCol; if (L.over === 'overalls') { rr(c, -10, -bh + 9, 20, bh - 9, 6); c.fill(); c.strokeStyle = L.overCol; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-6, -bh + 1); c.lineTo(5, -bh + 10); c.moveTo(6, -bh + 1); c.lineTo(-5, -bh + 10); c.stroke(); } else if (L.over === 'apron') { c.fillRect(-10, -bh + 8, 20, 2.2); disc(c, 0, -bh + 9, 2.3); } else { rr(c, -10, -bh, 20, bh, 7); c.fill(); } }
    if (L.extra === 'backpack') { c.fillStyle = L.packCol; rr(c, -9, -bh + 1, 18, 15, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,.32)'; c.fillRect(-6, -bh + 6, 12, 1.6); }
  }
  else if (L.over === 'overalls') { c.fillStyle = L.overCol; rr(c, -10, -bh + 9, 20, bh - 9, 6); c.fill(); rr(c, -6.5, -bh + 3, 13, 9, 2.5); c.fill(); c.fillRect(-6.5, -bh, 2.6, 5); c.fillRect(3.9, -bh, 2.6, 5); c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, -3, -bh + 6, 6, 4.5, 1.2); c.fill(); }
  else if (L.over === 'apron') { c.fillStyle = L.overCol; rr(c, -7, -bh + 3, 14, bh - 3.5, 3); c.fill(); c.fillRect(-4.6, -bh, 1.8, 4); c.fillRect(2.8, -bh, 1.8, 4); c.fillStyle = 'rgba(0,0,0,.1)'; rr(c, -3.6, -bh + 9, 7.2, 4.6, 1.2); c.fill(); }
  else if (L.over === 'vest' || L.over === 'cardigan') { c.fillStyle = L.overCol; rr(c, -10, -bh, 7.4, bh, 5); c.fill(); rr(c, 2.6, -bh, 7.4, bh, 5); c.fill(); if (L.over === 'cardigan') { c.fillStyle = 'rgba(255,255,255,.75)'; disc(c, 0, -bh + 7, 0.9); disc(c, 0, -bh + 12, 0.9); } }
  if (L.extra === 'heart' && !back) { c.fillStyle = '#2f8a4a'; disc(c, 6.2, -bh + 6, 2); }
  if (L.extra === 'badge' && !back) { c.fillStyle = '#fdfbf2'; disc(c, 5.6, -bh + 6.4, 2.4); c.fillStyle = '#c2643f'; disc(c, 5.6, -bh + 6.4, 1.1); }
  if (L.extra === 'backpack' && !back) { c.strokeStyle = L.packCol; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-6, -bh + 1); c.lineTo(-6, -bh + 11); c.moveTo(6, -bh + 1); c.lineTo(6, -bh + 11); c.stroke(); }
  // arms: at the sides, or forward when the hands are full
  const ay = -bh + 8;
  c.fillStyle = L.sleeves || (L.over === 'cardigan' ? L.overCol : L.top);
  if (hold) { oval(c, -8.6, ay + 2, 3.6, 5.2); oval(c, 8.6, ay + 2, 3.6, 5.2); }
  else { oval(c, -11.4, ay + 1 + sw * 1.6, 3.5, 6); oval(c, 11.4, ay + 1 - sw * 1.6, 3.5, 6); c.fillStyle = L.skin; disc(c, -11.6, ay + 6.6 + sw * 1.6, 2.5); disc(c, 11.6, ay + 6.6 - sw * 1.6, 2.5); }
  if (hold) {
    const y = -bh + 13;
    if (hold === 'basket') { c.fillStyle = '#7fc955'; disc(c, -4, y - 5, 4); disc(c, 1.5, y - 6, 4.4); disc(c, 6, y - 4.6, 3.6); c.fillStyle = '#b07a3e'; c.beginPath(); c.moveTo(-10, y - 4); c.lineTo(10, y - 4); c.lineTo(7.6, y + 5); c.lineTo(-7.6, y + 5); c.closePath(); c.fill(); c.strokeStyle = '#8a5c2c'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9.3, y - 1); c.lineTo(9.3, y - 1); c.moveTo(-8.4, y + 2); c.lineTo(8.4, y + 2); c.stroke(); }
    else if (hold === 'crate' || hold === 'box') { c.fillStyle = '#7fc955'; disc(c, -4, y - 5.5, 3.8); disc(c, 2.5, y - 6, 4.2); c.fillStyle = hold === 'box' ? '#c99a5b' : '#a8743c'; rr(c, -9.5, y - 5, 19, 11, 2); c.fill(); if (hold === 'box') { c.fillStyle = '#fbf6e9'; c.fillRect(-4.5, y - 1.6, 9, 4.4); c.fillStyle = '#2f6b3a'; c.fillRect(-2.6, y + 0.1, 5.2, 1.1); } else { c.fillStyle = '#8a5c2c'; c.fillRect(-9.5, y, 19, 1.3); } }
    else if (hold === 'tea') { c.fillStyle = '#f4ecd6'; rr(c, -7, y - 4.5, 14, 10, 1.8); c.fill(); c.fillStyle = '#8fc45a'; c.fillRect(-4, y - 0.8, 8, 2.8); }
    else if (hold === 'tray') { c.fillStyle = '#5f4f34'; rr(c, -10, y - 3, 20, 8, 1.6); c.fill(); c.fillStyle = '#8fd05c'; [-6.5, -2.2, 2.2, 6.5].forEach((x) => disc(c, x, y - 3.4, 1.9)); }
    else if (hold === 'bucket') { c.fillStyle = '#7d868c'; c.beginPath(); c.moveTo(-7, y - 4); c.lineTo(7, y - 4); c.lineTo(5.4, y + 5); c.lineTo(-5.4, y + 5); c.closePath(); c.fill(); c.fillStyle = '#6b4a2a'; c.fillRect(-6, y - 4, 12, 2); }
    else if (hold === 'bowl') { c.fillStyle = '#7fc955'; disc(c, 0, y - 3.4, 4.4); c.fillStyle = '#fdfbf2'; c.beginPath(); c.arc(0, y - 2.6, 6.4, 0, Math.PI); c.closePath(); c.fill(); c.strokeStyle = '#d6caa6'; c.lineWidth = 0.8; c.stroke(); }
    else if (hold === 'paper') { c.fillStyle = '#fdfbf2'; rr(c, -6.5, y - 4, 13, 9, 1.2); c.fill(); c.strokeStyle = '#9aa0a6'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-4, y - 1.4); c.lineTo(4, y - 1.4); c.moveTo(-4, y + 1.2); c.lineTo(2.5, y + 1.2); c.stroke(); }
    c.fillStyle = L.skin; disc(c, -8.9, y + 0.4, 2.5); disc(c, 8.9, y + 0.4, 2.5);
  }
  if (L.neck) { c.fillStyle = L.neckCol; rr(c, -8.4, -bh - 1.8, 16.8, 4.6, 2.2); c.fill(); if (back) { /* only the band shows */ } else if (L.neck === 'towel') { c.fillRect(-7.4, -bh + 1, 3.6, 7); c.fillRect(3.8, -bh + 1, 3.6, 7); } else c.fillRect(2.4, -bh + 1, 4, 8); }
  // the head
  c.translate(0, -bh - 10.5);
  if (L.style === 'bob') { c.fillStyle = L.hair; rr(c, -14, -6, 28, 17, 7); c.fill(); }
  if (L.style === 'pony' && !back) { c.fillStyle = L.hair; c.save(); c.translate(12.5, 2); c.rotate(0.5); oval(c, 0, 3, 4, 8.5); c.restore(); }
  if (L.style === 'bun' && !L.hat) { c.fillStyle = L.hair; disc(c, 0, -14.5, 5); }
  c.fillStyle = L.skin; disc(c, -12.4, 1, 2.5); disc(c, 12.4, 1, 2.5); disc(c, 0, 0, 13);
  if (L.hat === 'cone') { c.fillStyle = L.hatCol; rr(c, -13.8, -5, 5.2, 15, 2.6); c.fill(); rr(c, 8.6, -5, 5.2, 15, 2.6); c.fill(); }
  if (back) {                              // the back of the head: hair, and no face
    c.fillStyle = L.hair; disc(c, 0, -1.2, 13.3); c.fillStyle = L.skin; rr(c, -4.6, 9.4, 9.2, 4.8, 2); c.fill();
    if (L.style === 'pony') { c.fillStyle = L.hair; oval(c, 0, 9.5, 4.2, 9); }
    if (L.style === 'bun' && !L.hat) { c.fillStyle = 'rgba(0,0,0,.18)'; disc(c, 0, -2, 5.8); c.fillStyle = L.hair; disc(c, 0, -2.8, 5.2); }
  } else {
  c.fillStyle = L.hair; c.beginPath();
  if (L.style === 'grey') { c.arc(0, -1, 13.2, Math.PI * 1.08, Math.PI * 1.92); c.quadraticCurveTo(0, -9.5, -12.5, -4.3); }
  else { c.arc(0, -1, 13.3, Math.PI * 0.98, Math.PI * 2.02); c.quadraticCurveTo(6, -6.5, 0, -5.4); c.quadraticCurveTo(-7, -4, -13.3, -0.2); }
  c.closePath(); c.fill();
  // the face: eyes that blink, cheeks, and a mouth that says how the work is going
  const ex = 5, ey = 1.6, blink = st.mood !== 'happy' && ((st.t * 0.9 + st.ph) % 3.4) < 0.13;
  c.strokeStyle = '#2b2420'; c.lineWidth = 1.5; c.fillStyle = '#2b2420';
  if (st.mood === 'happy') [-ex, ex].forEach((x) => { c.beginPath(); c.arc(x, ey + 1.3, 2.4, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); });
  else if (blink) [-ex, ex].forEach((x) => { c.beginPath(); c.moveTo(x - 2, ey); c.lineTo(x + 2, ey); c.stroke(); });
  else { [-ex, ex].forEach((x) => oval(c, x, ey, 1.8, 2.4)); c.fillStyle = '#fff'; disc(c, -ex + 0.7, ey - 0.9, 0.7); disc(c, ex + 0.7, ey - 0.9, 0.7); }
  c.fillStyle = 'rgba(238,120,120,.45)'; oval(c, -8.2, 5.4, 2.7, 1.7); oval(c, 8.2, 5.4, 2.7, 1.7);
  c.strokeStyle = '#8a3a2a'; c.lineWidth = 1.4;
  if (st.mood === 'happy') { c.fillStyle = '#a3352f'; c.beginPath(); c.arc(0, 5.4, 3.1, 0, Math.PI); c.closePath(); c.fill(); }
  else if (st.mood === 'focus') { c.beginPath(); c.moveTo(-1.8, 6.8); c.lineTo(1.8, 6.8); c.stroke(); if (((st.t + st.ph) % 4) < 1.2) { c.fillStyle = '#7ec8e8'; c.beginPath(); c.moveTo(11.5, -6.5); c.quadraticCurveTo(14.4, -1.6, 11.5, -0.6); c.quadraticCurveTo(8.6, -1.6, 11.5, -6.5); c.fill(); } }
  else { c.beginPath(); c.arc(0, 4.4, 3.2, Math.PI * 0.18, Math.PI * 0.82); c.stroke(); }
  if (L.extra === 'glasses') { c.strokeStyle = '#3b3a34'; c.lineWidth = 1.1; [-ex, ex].forEach((x) => { c.beginPath(); c.arc(x, ey, 3.6, 0, TAU); c.stroke(); }); c.beginPath(); c.moveTo(-1.4, ey); c.lineTo(1.4, ey); c.stroke(); }
  if (L.style === 'grey') { c.strokeStyle = '#9a9a94'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-7, -3); c.lineTo(-3.2, -3.6); c.moveTo(7, -3); c.lineTo(3.2, -3.6); c.stroke(); }
  }
  // what is on the head
  if (L.hat === 'straw') { c.fillStyle = '#cfa944'; oval(c, 0, -7.2, 19.6, 5.6); c.fillStyle = '#ecd27c'; oval(c, 0, -8, 18.6, 4.8); c.fillStyle = '#e2c466'; c.beginPath(); c.ellipse(0, -8.6, 10.6, 9.8, 0, Math.PI, 0); c.closePath(); c.fill(); c.fillStyle = L.hatCol; c.fillRect(-10.5, -11.6, 21, 3.2); }
  else if (L.hat === 'cone') { c.fillStyle = '#c4a252'; c.beginPath(); c.moveTo(-20.5, -5.6); c.lineTo(20.5, -5.6); c.lineTo(0, -21.5); c.closePath(); c.fill(); c.fillStyle = '#e3c87c'; c.beginPath(); c.moveTo(-18, -7); c.lineTo(18, -7); c.lineTo(0, -20.4); c.closePath(); c.fill(); c.strokeStyle = 'rgba(120,90,40,.35)'; c.lineWidth = 0.8; [-10, -4, 4, 10].forEach((x) => { c.beginPath(); c.moveTo(0, -20); c.lineTo(x, -7); c.stroke(); }); c.fillStyle = L.hatCol; disc(c, 0, 13.4, 2.6); }
  else if (L.hat === 'white') { c.fillStyle = '#fdfbf2'; oval(c, 0, -11.5, 12.6, 7.4); c.fillRect(-12.6, -11, 25.2, 5.4); c.fillStyle = 'rgba(0,0,0,.09)'; c.fillRect(-12.6, -6.8, 25.2, 1.2); }
  else if (L.hat === 'scarf') { c.fillStyle = L.hatCol; c.beginPath(); c.ellipse(0, -4.2, 13.7, 10.6, 0, Math.PI, 0); c.closePath(); c.fill(); disc(c, 12.6, -3.2, 3.1); c.fillStyle = 'rgba(255,255,255,.55)'; [-7, -1, 5].forEach((x) => disc(c, x, -9.4, 1)); }
  else if (L.hat === 'cap' || L.hat === 'school') { c.fillStyle = L.hat === 'school' ? '#f6cf3c' : L.hatCol; c.beginPath(); c.ellipse(0, -5.2, 13.5, 9.8, 0, Math.PI, 0); c.closePath(); c.fill(); if (!back) { c.fillStyle = L.hat === 'school' ? '#e0b420' : 'rgba(0,0,0,.2)'; oval(c, 3.5, -5, 10.6, 2.6); } }
  c.restore();
}
export function portrait(L, mood, px, carry, sit) {       // the same figure, large enough to see the face
  const cv = document.createElement('canvas'), d = Math.min(window.devicePixelRatio || 1, 2), w = px, h = Math.round(px * 1.18), k = px / 50;
  cv.className = 'face'; cv.width = w * d; cv.height = h * d; cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.setAttribute('aria-hidden', 'true');
  const c = cv.getContext('2d'); c.setTransform(d * k, 0, 0, d * k, d * w / 2, d * (h - 4));
  drawChar(c, L, { t: 0, ph: 1, moving: false, step: 0, bend: false, sit: !!sit, carry: carry || null, mood: mood || 'smile', dir: 1 });
  return cv;
}
