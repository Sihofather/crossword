// 아이콘 생성 (게임 속 냥검객 스프라이트 사용): node store/make-icons.js
// → store/icon-512.png, www/icon-512.png, 안드로이드 mipmap 전 해상도
const { chromium } = require('playwright'); const path = require('path');
const res = path.join(__dirname, '../android/app/src/main/res');
const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, '../www/index.html').replace('index.html', 'privacy.html'));
  await p.addScriptTag({ path: path.join(__dirname, '../www/art.js') });
  // mode: full(배경+캐릭터, 둥근 사각), round(원형), fg(투명 배경, 안전영역 66%)
  const png = (size, mode) => p.evaluate(([size, mode]) => {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    if (mode !== 'fg') {
      x.beginPath(); if (mode === 'round') x.arc(size / 2, size / 2, size / 2, 0, 7); else x.roundRect(0, 0, size, size, size * 0.22); x.clip();
      const g = x.createLinearGradient(0, 0, 0, size); g.addColorStop(0, '#3b2a5c'); g.addColorStop(1, '#ff8a3d'); x.fillStyle = g; x.fillRect(0, 0, size, size);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(size * 0.5, size * 0.55, size * 0.4, 0, 7); x.fill();
    }
    const s = mode === 'fg' ? size * 0.62 : size * 0.92;
    // 검
    x.save(); x.translate(size / 2 + s * 0.3, size / 2 + s * 0.12); x.rotate(0.5);
    x.lineWidth = Math.max(2, s * 0.02); x.strokeStyle = '#1b1430';
    x.beginPath(); x.moveTo(-s * 0.04, 0); x.lineTo(-s * 0.04, -s * 0.5); x.lineTo(0, -s * 0.58); x.lineTo(s * 0.04, -s * 0.5); x.lineTo(s * 0.04, 0); x.closePath();
    x.fillStyle = '#eaf6ff'; x.fill(); x.stroke(); x.fillStyle = '#ffcf4a'; x.fillRect(-s * 0.1, -s * 0.02, s * 0.2, s * 0.05); x.restore();
    x.drawImage(ART.sprite('hero', 4), size / 2 - s / 2, size / 2 - s * 0.55, s, s);
    return c.toDataURL('image/png').split(',')[1];
  }, [size, mode]);
  const fs = require('fs'); const w = (f, b64) => fs.writeFileSync(f, Buffer.from(b64, 'base64'));
  w(path.join(__dirname, 'icon-512.png'), await png(512, 'full'));
  w(path.join(__dirname, '../www/icon-512.png'), await png(512, 'full'));
  for (const [d, k] of Object.entries(D)) {
    w(`${res}/mipmap-${d}/ic_launcher.png`, await png(Math.round(48 * k), 'full'));
    w(`${res}/mipmap-${d}/ic_launcher_round.png`, await png(Math.round(48 * k), 'round'));
    w(`${res}/mipmap-${d}/ic_launcher_foreground.png`, await png(Math.round(108 * k), 'fg'));
  }
  await b.close(); console.log('icons ok');
})();
