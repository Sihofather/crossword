'use strict';
/* =====================================================================
   냥검객 키우기 — 아트 (모든 캐릭터를 코드로 그림, 외부 이미지 없음)
   스프라이트는 한 번 그려서 오프스크린 캔버스에 캐시한다.
   ===================================================================== */
const ART = (() => {
  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  const S = 160; // 스프라이트 기준 크기

  function body(c, sp, out) {
    c.beginPath();
    if (sp.shape === 'ghost') {
      c.moveTo(30, 95); c.bezierCurveTo(30, 30, 130, 30, 130, 95);
      c.lineTo(130, 135);
      for (let i = 0; i < 4; i++) { const x = 130 - i * 25; c.quadraticCurveTo(x - 6, 150, x - 12.5, 135); c.quadraticCurveTo(x - 19, 120, x - 25, 135); }
      c.closePath();
    } else if (sp.shape === 'tall') c.ellipse(80, 100, 40, 52, 0, 0, Math.PI * 2);
    else if (sp.shape === 'wide') c.ellipse(80, 108, 60, 40, 0, 0, Math.PI * 2);
    else if (sp.shape === 'small') c.ellipse(80, 108, 38, 34, 0, 0, Math.PI * 2);
    else c.ellipse(80, 102, 50, 44, 0, 0, Math.PI * 2);
    const g = c.createLinearGradient(0, 40, 0, 150); g.addColorStop(0, shade(sp.body, 0.15)); g.addColorStop(1, shade(sp.body, -0.12));
    c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = out; c.stroke();
  }
  const topY = sp => sp.shape === 'tall' ? 50 : sp.shape === 'wide' ? 70 : sp.shape === 'small' ? 76 : sp.shape === 'ghost' ? 48 : 60;

  function ears(c, sp, out) {
    const y = topY(sp) + 8, col = sp.ear || sp.body;
    c.lineWidth = 5; c.strokeStyle = out;
    const tri = (x1, y1, x2, y2, x3, y3, fill) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fillStyle = fill; c.fill(); c.stroke(); };
    switch (sp.ears) {
      case 'cat': case 'fox': {
        const h = sp.ears === 'fox' ? 44 : 34;
        tri(42, y + 10, 46, y - h, 74, y - 2, col); tri(118, y + 10, 114, y - h, 86, y - 2, col);
        c.fillStyle = sp.inner || '#ffb3c1'; c.beginPath(); c.moveTo(50, y + 2); c.lineTo(51, y - h + 14); c.lineTo(66, y); c.fill();
        c.beginPath(); c.moveTo(110, y + 2); c.lineTo(109, y - h + 14); c.lineTo(94, y); c.fill(); break; }
      case 'round':
        [[46, y], [114, y]].forEach(([x, yy]) => { c.beginPath(); c.arc(x, yy, 15, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.stroke();
          c.beginPath(); c.arc(x, yy, 7, 0, Math.PI * 2); c.fillStyle = sp.inner || shade(col, -0.25); c.fill(); }); break;
      case 'horn1': tri(70, y + 4, 80, y - 34, 90, y + 4, sp.horn || '#ffe6a8'); break;
      case 'horn2': tri(48, y + 10, 44, y - 30, 66, y + 2, sp.horn || '#ffe6a8'); tri(112, y + 10, 116, y - 30, 94, y + 2, sp.horn || '#ffe6a8'); break;
      case 'bat':
        tri(46, y + 8, 36, y - 30, 70, y, col); tri(114, y + 8, 124, y - 30, 90, y, col); break;
      case 'antenna':
        c.beginPath(); c.moveTo(66, y + 2); c.quadraticCurveTo(56, y - 26, 44, y - 30); c.moveTo(94, y + 2); c.quadraticCurveTo(104, y - 26, 116, y - 30); c.stroke();
        break;
    }
  }

  function back(c, sp, out) {
    c.lineWidth = 5; c.strokeStyle = out;
    for (const x of sp.extra || []) {
      if (x === 'tail9') {
        for (let i = 0; i < 9; i++) { const a = -1.36 + i * 0.34; c.save(); c.translate(80, 104); c.rotate(a);
          c.beginPath(); c.ellipse(0, -50, 12, 28, 0, 0, Math.PI * 2); c.fillStyle = i % 2 ? sp.body : shade(sp.body, -0.06); c.fill(); c.stroke();
          c.beginPath(); c.ellipse(0, -70, 7, 9, 0, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.restore(); }
      } else if (x === 'tail') {
        c.beginPath(); c.moveTo(120, 118); c.quadraticCurveTo(156, 110, 148, 70); c.lineWidth = 14; c.strokeStyle = out; c.stroke();
        c.lineWidth = 8; c.strokeStyle = sp.body; c.stroke(); c.lineWidth = 5;
      } else if (x === 'foxtail') {
        c.beginPath(); c.ellipse(130, 92, 18, 36, 0.6, 0, Math.PI * 2); c.fillStyle = sp.body; c.fill(); c.strokeStyle = out; c.stroke();
        c.beginPath(); c.ellipse(144, 66, 9, 13, 0.6, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
      } else if (x === 'wings') {
        [[1], [-1]].forEach(([d]) => { c.beginPath(); c.moveTo(80 + d * 30, 96); c.lineTo(80 + d * 74, 62); c.lineTo(80 + d * 66, 92); c.lineTo(80 + d * 76, 112); c.lineTo(80 + d * 56, 106); c.closePath();
          c.fillStyle = shade(sp.body, -0.2); c.fill(); c.stroke(); });
      } else if (x === 'legs8') {
        for (let i = 0; i < 4; i++) [[1], [-1]].forEach(([d]) => { c.beginPath(); const y0 = 100 + i * 9; c.moveTo(80 + d * 30, y0); c.quadraticCurveTo(80 + d * 66, y0 - 26 + i * 6, 80 + d * 70, y0 + 30); c.stroke(); });
      } else if (x === 'tentacles') {
        for (let i = 0; i < 6; i++) { const x0 = 44 + i * 14.5; c.beginPath(); c.moveTo(x0, 122); c.quadraticCurveTo(x0 + (i % 2 ? 12 : -12), 140, x0 + (i < 3 ? -10 : 10), 152);
          c.lineWidth = 15; c.strokeStyle = out; c.stroke(); c.lineWidth = 9; c.strokeStyle = sp.body; c.stroke(); } c.lineWidth = 5;
      } else if (x === 'fin') {
        c.beginPath(); c.moveTo(66, 70); c.lineTo(86, 26); c.lineTo(100, 72); c.closePath(); c.fillStyle = shade(sp.body, -0.1); c.fill(); c.stroke();
      } else if (x === 'claws') {
        [[24, 96, -0.5], [136, 96, 0.5]].forEach(([x0, y0, r]) => { c.save(); c.translate(x0, y0); c.rotate(r);
          c.beginPath(); c.arc(0, 0, 18, 0.4, Math.PI * 2 - 0.4); c.lineTo(0, 0); c.closePath(); c.fillStyle = sp.body; c.fill(); c.stroke(); c.restore(); });
      } else if (x === 'serpent') {
        c.beginPath(); c.ellipse(80, 132, 62, 18, 0, 0, Math.PI * 2); c.fillStyle = shade(sp.body, -0.08); c.fill(); c.stroke();
      } else if (x === 'flameAura') {
        for (let i = 0; i < 5; i++) { const x0 = 40 + i * 20; c.beginPath(); c.moveTo(x0 - 12, 70); c.quadraticCurveTo(x0, 20 - (i % 2) * 14, x0 + 12, 70); c.fillStyle = 'rgba(140,220,255,.55)'; c.fill(); }
      } else if (x === 'whisker') { /* front */ }
    }
  }

  function front(c, sp, out) {
    c.lineWidth = 5; c.strokeStyle = out;
    for (const x of sp.extra || []) {
      if (x === 'stripe') {
        c.save(); c.beginPath(); c.ellipse(80, 102, 47, 41, 0, 0, Math.PI * 2); c.clip();
        c.fillStyle = sp.stripe || '#fff'; c.fillRect(70, 50, 20, 40); c.restore();
      } else if (x === 'tabby') {
        c.strokeStyle = shade(sp.body, -0.25); c.lineWidth = 5;
        [[70, 62, 70, 76], [80, 60, 80, 74], [90, 62, 90, 76]].forEach(([a, b2, d, e]) => { c.beginPath(); c.moveTo(a, b2); c.lineTo(d, e); c.stroke(); });
        c.strokeStyle = out;
      } else if (x === 'spots') {
        c.fillStyle = shade(sp.body, -0.2); [[52, 84, 6], [108, 90, 7], [100, 126, 5], [58, 122, 6]].forEach(([a, b2, r]) => { c.beginPath(); c.arc(a, b2, r, 0, 7); c.fill(); });
      } else if (x === 'spikes') {
        c.fillStyle = '#fff6d6'; [[40, 100], [120, 100], [80, 140], [52, 132], [108, 132], [80, 58]].forEach(([a, b2]) => { c.beginPath(); c.arc(a, b2, 5, 0, 7); c.fill(); c.lineWidth = 2; c.stroke(); }); c.lineWidth = 5;
      } else if (x === 'chestV') {
        c.beginPath(); c.moveTo(62, 112); c.lineTo(80, 132); c.lineTo(98, 112); c.lineTo(80, 122); c.closePath(); c.fillStyle = '#f4efe2'; c.fill();
      } else if (x === 'club') {
        c.save(); c.translate(128, 120); c.rotate(-0.5);
        c.beginPath(); c.roundRect(-7, -6, 14, 30, 5); c.fillStyle = '#8b5a2b'; c.fill(); c.stroke();
        c.beginPath(); c.roundRect(-14, -46, 28, 44, 12); c.fillStyle = '#b07a3c'; c.fill(); c.stroke();
        c.fillStyle = '#e6e0d0'; [[-6, -36], [6, -24], [-5, -14], [7, -40]].forEach(([a, b2]) => { c.beginPath(); c.moveTo(a - 4, b2); c.lineTo(a, b2 - 8); c.lineTo(a + 4, b2); c.fill(); });
        c.restore();
      } else if (x === 'gat') { // 저승사자 갓
        c.fillStyle = '#16121f'; c.beginPath(); c.ellipse(80, 60, 66, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.roundRect(54, 20, 52, 42, 8); c.fill(); c.stroke();
        c.strokeStyle = '#3a3150'; c.lineWidth = 2; c.beginPath(); c.moveTo(56, 66); c.quadraticCurveTo(60, 120, 58, 150); c.moveTo(104, 66); c.quadraticCurveTo(100, 120, 102, 150); c.stroke();
        c.lineWidth = 5; c.strokeStyle = out;
      } else if (x === 'hair') {
        c.fillStyle = '#1a1424'; c.beginPath(); c.moveTo(34, 96); c.bezierCurveTo(30, 34, 130, 34, 126, 96); c.lineTo(122, 140); c.lineTo(108, 100); c.quadraticCurveTo(80, 70, 52, 100); c.lineTo(38, 140); c.closePath(); c.fill();
      } else if (x === 'headband') {
        c.fillStyle = '#e8384f'; c.beginPath(); c.roundRect(34, 66, 92, 13, 6); c.fill(); c.lineWidth = 3; c.stroke();
        c.beginPath(); c.moveTo(40, 72); c.quadraticCurveTo(18, 70, 8, 86); c.lineTo(16, 90); c.quadraticCurveTo(24, 80, 40, 78); c.fill(); c.stroke(); c.lineWidth = 5;
      } else if (x === 'whisker') {
        c.strokeStyle = shade(out, 0.2); c.lineWidth = 2;
        [[-1], [1]].forEach(([d]) => { [-4, 4].forEach(o => { c.beginPath(); c.moveTo(80 + d * 22, 108 + o); c.lineTo(80 + d * 44, 104 + o * 2); c.stroke(); }); });
        c.lineWidth = 5; c.strokeStyle = out;
      } else if (x === 'shell') {
        c.beginPath(); c.ellipse(80, 108, 52, 34, 0, Math.PI, 0); c.fillStyle = shade(sp.body, -0.15); c.fill(); c.stroke();
      } else if (x === 'candle') {
        c.beginPath(); c.moveTo(80, 18); c.quadraticCurveTo(96, 42, 80, 54); c.quadraticCurveTo(64, 42, 80, 18); c.fillStyle = '#ffcf4a'; c.fill();
      } else if (x === 'leaf') {
        c.fillStyle = '#8fbf4a'; c.beginPath(); c.ellipse(96, 50, 9, 18, 0.6, 0, 7); c.fill(); c.stroke();
      } else if (x === 'bones') {
        c.strokeStyle = '#d8d2c4'; c.lineWidth = 4; [92, 104, 116].forEach(y => { c.beginPath(); c.moveTo(62, y); c.lineTo(98, y); c.stroke(); }); c.lineWidth = 5; c.strokeStyle = out;
      }
    }
  }

  function face(c, sp, out) {
    const ey = sp.eyeY || (topY(sp) + 40), dx = sp.eyeGap || 18;
    c.fillStyle = '#1b1430';
    const eyeType = sp.eyes || 'cute';
    [-1, 1].forEach(d => {
      const ex = 80 + d * dx;
      if (eyeType === 'cute' || eyeType === 'hero') {
        const r = eyeType === 'hero' ? 9 : 8; c.fillStyle = '#1b1430'; c.beginPath(); c.ellipse(ex, ey, r, r + 2, 0, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - 3, ey - 4, 3.2, 0, 7); c.fill(); c.beginPath(); c.arc(ex + 3, ey + 3, 1.6, 0, 7); c.fill();
      } else if (eyeType === 'angry') {
        c.fillStyle = sp.eyeCol || '#fff2a8'; c.beginPath(); c.ellipse(ex, ey, 9, 8, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = out; c.stroke();
        c.fillStyle = '#1b1430'; c.beginPath(); c.arc(ex - d * 1, ey + 1, 4, 0, 7); c.fill();
        c.lineWidth = 5; c.strokeStyle = out; c.beginPath(); c.moveTo(ex - d * 12, ey - 14); c.lineTo(ex + d * 8, ey - 7); c.stroke();
      } else if (eyeType === 'hollow') {
        c.fillStyle = '#1b1430'; c.beginPath(); c.ellipse(ex, ey, 10, 12, 0, 0, 7); c.fill();
        c.fillStyle = sp.eyeCol || '#6fe3ff'; c.beginPath(); c.arc(ex, ey + 1, 3.5, 0, 7); c.fill();
      } else if (eyeType === 'sleepy') {
        c.lineWidth = 4; c.strokeStyle = '#1b1430'; c.beginPath(); c.arc(ex, ey - 2, 7, 0.2, Math.PI - 0.2); c.stroke();
      } else if (eyeType === 'dot') {
        c.fillStyle = '#1b1430'; c.beginPath(); c.arc(ex, ey, 5, 0, 7); c.fill();
      }
    });
    if (sp.blush !== false) { c.fillStyle = 'rgba(255,110,130,.35)'; [-1, 1].forEach(d => { c.beginPath(); c.ellipse(80 + d * (dx + 14), ey + 14, 8, 5, 0, 0, 7); c.fill(); }); }
    const my = ey + 20; c.lineWidth = 3.5; c.strokeStyle = '#1b1430'; c.fillStyle = '#1b1430';
    switch (sp.mouth || 'smile') {
      case 'smile': c.beginPath(); c.moveTo(72, my - 2); c.quadraticCurveTo(76, my + 4, 80, my - 1); c.quadraticCurveTo(84, my + 4, 88, my - 2); c.stroke(); break;
      case 'grin': c.beginPath(); c.moveTo(66, my - 4); c.quadraticCurveTo(80, my + 14, 94, my - 4); c.closePath(); c.fill(); c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(80, my + 4, 6, 3, 0, 0, 7); c.fill(); break;
      case 'fang': c.beginPath(); c.moveTo(68, my); c.lineTo(92, my); c.stroke(); c.fillStyle = '#fff'; [[72], [86]].forEach(([x]) => { c.beginPath(); c.moveTo(x, my); c.lineTo(x + 3, my + 8); c.lineTo(x + 6, my); c.fill(); c.lineWidth = 1.5; c.stroke(); }); break;
      case 'tusk': c.fillStyle = sp.belly || '#e9a98a'; c.beginPath(); c.ellipse(80, my, 18, 12, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = out; c.stroke();
        c.fillStyle = '#1b1430'; c.beginPath(); c.arc(74, my, 3, 0, 7); c.arc(86, my, 3, 0, 7); c.fill();
        c.fillStyle = '#fffbe8'; [[-1], [1]].forEach(([d]) => { c.beginPath(); c.moveTo(80 + d * 14, my + 6); c.quadraticCurveTo(80 + d * 22, my - 4, 80 + d * 20, my - 14); c.lineTo(80 + d * 12, my + 2); c.fill(); c.lineWidth = 2; c.stroke(); }); break;
      case 'o': c.beginPath(); c.ellipse(80, my + 2, 5, 7, 0, 0, 7); c.fill(); break;
      case 'teeth': c.fillStyle = '#1b1430'; c.beginPath(); c.roundRect(64, my - 4, 32, 12, 4); c.fill(); c.strokeStyle = '#d8d2c4'; c.lineWidth = 2;
        for (let x = 68; x < 96; x += 6) { c.beginPath(); c.moveTo(x, my - 4); c.lineTo(x, my + 8); c.stroke(); } break;
      case 'beak': c.fillStyle = '#ffb23f'; c.beginPath(); c.moveTo(72, my - 4); c.lineTo(88, my - 4); c.lineTo(80, my + 8); c.closePath(); c.fill(); c.lineWidth = 2.5; c.strokeStyle = out; c.stroke(); break;
      case 'cat': c.fillStyle = '#ff8fa0'; c.beginPath(); c.moveTo(76, my - 8); c.lineTo(84, my - 8); c.lineTo(80, my - 3); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(80, my - 3); c.quadraticCurveTo(76, my + 4, 71, my); c.moveTo(80, my - 3); c.quadraticCurveTo(84, my + 4, 89, my); c.stroke(); break;
    }
  }

  function draw(sp, k) {
    const cv = document.createElement('canvas'); cv.width = cv.height = Math.round(S * k);
    const c = cv.getContext('2d'); c.scale(k, k); c.lineJoin = 'round'; c.lineCap = 'round';
    const out = sp.out || shade(sp.body, -0.55);
    back(c, sp, out); ears(c, sp, out); body(c, sp, out);
    if (sp.belly && sp.mouth !== 'tusk') { c.beginPath(); c.ellipse(80, sp.shape === 'tall' ? 118 : 120, sp.shape === 'wide' ? 38 : 28, 20, 0, 0, 7); c.fillStyle = sp.belly; c.fill(); }
    front(c, sp, out); face(c, sp, out);
    if ((sp.extra || []).includes('gat')) { /* 갓은 얼굴 위 */ front(c, { ...sp, extra: ['gat'] }, out); }
    return cv;
  }

  /* ---------------- 캐릭터 정의 ---------------- */
  const HERO = { body: '#ffb04a', ears: 'cat', inner: '#ffc9d2', eyes: 'hero', mouth: 'cat', belly: '#fff1dc', extra: ['tail', 'tabby', 'headband', 'whisker'] };
  const MOBS = {
    boar:    { body: '#9a6a4a', ears: 'round', eyes: 'angry', mouth: 'tusk', belly: '#d9a184', shape: 'wide' },
    snake:   { body: '#6fbf5a', shape: 'tall', eyes: 'cute', mouth: 'fang', extra: ['serpent', 'spots'], belly: '#e8f2a6' },
    badger:  { body: '#7d7b86', ears: 'round', eyes: 'sleepy', mouth: 'smile', extra: ['stripe'], stripe: '#f2f0ea' },
    wolf:    { body: '#8a93a8', ears: 'fox', inner: '#d6d9e2', eyes: 'angry', mouth: 'fang', belly: '#dfe3ec', extra: ['foxtail'] },
    bear:    { body: '#3b3340', ears: 'round', inner: '#6b5e70', eyes: 'angry', eyeCol: '#ffcf4a', mouth: 'grin', extra: ['chestV', 'claws'], boss: true },
    dokkaebi:{ body: '#e8584f', ears: 'horn1', eyes: 'angry', mouth: 'teeth', belly: '#f7a07c', extra: ['spots'] },
    ghost:   { body: '#eef1ff', shape: 'ghost', eyes: 'hollow', mouth: 'o', blush: false, extra: ['hair'] },
    bat:     { body: '#5a4a7a', ears: 'bat', eyes: 'cute', mouth: 'fang', shape: 'small', extra: ['wings'] },
    spider:  { body: '#3e3550', eyes: 'cute', mouth: 'fang', shape: 'small', extra: ['legs8', 'spots'] },
    bigdok:  { body: '#3f7bd6', ears: 'horn2', eyes: 'angry', eyeCol: '#ffcf4a', mouth: 'teeth', belly: '#8fb8f0', extra: ['club', 'spots'], boss: true },
    fox:     { body: '#f08a3c', ears: 'fox', inner: '#fff1dc', eyes: 'sleepy', mouth: 'smile', belly: '#fff1dc', extra: ['foxtail'] },
    raccoon: { body: '#8c7b6b', ears: 'round', eyes: 'cute', mouth: 'smile', belly: '#e6dccf', extra: ['stripe'], stripe: '#3b302a' },
    wisp:    { body: '#7fd8ff', shape: 'ghost', eyes: 'dot', mouth: 'o', extra: ['flameAura'] },
    leaf:    { body: '#d9822b', shape: 'small', eyes: 'cute', mouth: 'smile', extra: ['leaf'] },
    gumiho:  { body: '#fbf6ee', ears: 'fox', inner: '#ff9fb2', eyes: 'angry', eyeCol: '#ff5d6c', mouth: 'fang', extra: ['tail9'], out: '#7a5a6a', boss: true },
    crab:    { body: '#f05a4a', shape: 'wide', eyes: 'cute', mouth: 'smile', extra: ['claws', 'antenna'], ears: 'antenna' },
    octopus: { body: '#c26bd6', eyes: 'cute', mouth: 'o', extra: ['tentacles', 'spots'] },
    shark:   { body: '#6f8fb0', shape: 'wide', eyes: 'angry', mouth: 'teeth', belly: '#eef2f6', extra: ['fin'] },
    puffer:  { body: '#f2c94c', eyes: 'cute', mouth: 'o', belly: '#fff5c8', extra: ['spikes'] },
    dragon:  { body: '#2fae8f', ears: 'horn2', horn: '#ffe08a', eyes: 'angry', eyeCol: '#ffcf4a', mouth: 'fang', belly: '#c9f0b8', extra: ['serpent', 'fin', 'spots'], boss: true },
    skull:   { body: '#e9e4d6', eyes: 'hollow', eyeCol: '#ff8a3d', mouth: 'teeth', blush: false, extra: ['bones'] },
    spirit:  { body: '#b9c6ff', shape: 'ghost', eyes: 'sleepy', mouth: 'o', blush: false },
    zombie:  { body: '#8bb07a', shape: 'tall', eyes: 'hollow', eyeCol: '#d8ff6a', mouth: 'teeth', blush: false, extra: ['spots'] },
    candle:  { body: '#f2ead8', shape: 'tall', eyes: 'dot', mouth: 'smile', extra: ['candle'] },
    reaper:  { body: '#2a2236', shape: 'ghost', eyes: 'hollow', eyeCol: '#ff5d6c', mouth: 'o', blush: false, out: '#0d0816', extra: ['gat'], boss: true },
  };
  const cache = {};
  // k: 해상도 배율 (기본 2 = 320px, 고해상도 화면에서도 선명)
  const sprite = (key, k = 2) => cache[key + k] || (cache[key + k] = draw(key === 'hero' ? HERO : MOBS[key], k));

  /* ---------------- 무기 아이콘 ---------------- */
  const TIERC = ['#b9b3cc', '#5fe39a', '#5fb8ff', '#c58bff', '#ffcf4a', '#ff5d6c'];
  const wcache = {};
  function weapon(i) {
    if (wcache[i]) return wcache[i];
    const t = Math.floor(i / 4), sub = i % 4, cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const c = cv.getContext('2d'), col = TIERC[t]; c.lineJoin = 'round'; c.lineCap = 'round';
    if (t >= 3) { const g = c.createRadialGradient(48, 48, 4, 48, 48, 46); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, 96, 96); }
    c.translate(48, 48); c.rotate(-Math.PI / 4);
    const blade = shade(col, 0.45), edge = shade(col, -0.35), len = 30 + sub * 3 + t * 2;
    c.lineWidth = 3; c.strokeStyle = '#1b1430';
    if (t === 3) { // 도끼
      c.fillStyle = '#7a5230'; c.fillRect(-3, -34, 6, 66); c.strokeRect(-3, -34, 6, 66);
      c.beginPath(); c.moveTo(3, -30); c.quadraticCurveTo(30, -26, 26, -6); c.quadraticCurveTo(14, -12, 3, -10); c.closePath(); c.fillStyle = blade; c.fill(); c.stroke();
    } else if (t === 4) { // 삼지창
      c.fillStyle = '#c99a3b'; c.fillRect(-3, -20, 6, 54); c.strokeRect(-3, -20, 6, 54);
      c.fillStyle = blade; [[-12], [0], [12]].forEach(([x]) => { c.beginPath(); c.moveTo(x - 4, -18); c.lineTo(x, -40 - (x ? 0 : 6)); c.lineTo(x + 4, -18); c.closePath(); c.fill(); c.stroke(); });
      c.beginPath(); c.moveTo(-14, -18); c.lineTo(14, -18); c.stroke();
    } else if (t === 5) { // 신화 지팡이검
      c.fillStyle = '#3a2a5c'; c.fillRect(-3, -14, 6, 48); c.strokeRect(-3, -14, 6, 48);
      c.beginPath(); c.moveTo(0, -44); c.lineTo(8, -14); c.lineTo(0, -8); c.lineTo(-8, -14); c.closePath(); c.fillStyle = blade; c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -14, 7, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
      c.strokeStyle = col; c.lineWidth = 2; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(a) * 12, -14 + Math.sin(a) * 12); c.lineTo(Math.cos(a) * 18, -14 + Math.sin(a) * 18); c.stroke(); }
    } else { // 검 (일반~희귀)
      const w = t === 0 ? 5 : t === 1 ? 6 : 8;
      c.beginPath(); c.moveTo(-w, 10); c.lineTo(-w, -len + 8); c.lineTo(0, -len); c.lineTo(w, -len + 8); c.lineTo(w, 10); c.closePath();
      const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, blade); g.addColorStop(1, edge); c.fillStyle = g; c.fill(); c.stroke();
      c.fillStyle = col; c.beginPath(); c.roundRect(-14 - t * 2, 9, 28 + t * 4, 7, 3); c.fill(); c.stroke();
      c.fillStyle = '#6b4a2a'; c.fillRect(-3, 16, 6, 16); c.strokeRect(-3, 16, 6, 16);
      c.beginPath(); c.arc(0, 34, 4.5, 0, 7); c.fillStyle = col; c.fill(); c.stroke();
    }
    return (wcache[i] = cv.toDataURL());
  }

  return { sprite, weapon, MOBS, TIERC, shade };
})();
