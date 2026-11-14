// 스토어 스크린샷/아이콘/피처그래픽 생성: node store/shots.js
const { chromium } = require('playwright');
const path = require('path'), out = __dirname, www = 'file://' + path.join(__dirname, '../www/index.html');
(async () => {
  const b = await chromium.launch();
  // 아이콘은 store/make-icons.js 에서 생성
  let p;
  // 피처 그래픽 1024x500
  p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await p.goto('file://' + path.join(__dirname, 'feature.html')); await p.waitForTimeout(300); await p.screenshot({ path: out + '/feature-1024x500.png' }); await p.close();
  // 폰 스크린샷 1080x1920
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    const now = Date.now(), inv = {}; [0,1,2,3,4,5,6,7,8,9,10,11,12,13,16].forEach(i => inv[i] = 1 + (i * 3) % 5);
    localStorage.setItem('nyang_save_v1', JSON.stringify({ gold: 8.4e13, gems: 3250, souls: 1840, stage: 37, wave: 4, maxStage: 41,
      lv: { atk: 520, spd: 38, crit: 30, critd: 60, gold: 45 }, inv, equip: 16, cleared: {}, buffs: { atk: now + 25 * 60e3, gold: now + 12 * 60e3, spd: 0 },
      stats: { kills: 9000, rebirths: 3, pulls: 400, playSec: 9999 }, att: { last: 0, streak: 3 }, last: now }));
  });
  const shot = async (name, fn) => { const q = await ctx.newPage(); await q.goto(www); await q.waitForTimeout(400);
    await q.evaluate(() => document.getElementById('modal').classList.remove('show')); if (fn) await fn(q); await q.waitForTimeout(1500);
    await q.screenshot({ path: `${out}/${name}.png` }); await q.close(); };
  await shot('shot-1-battle');
  await shot('shot-2-boss', async q => { await q.evaluate(() => { S.stage = 37; S.wave = 10; S.farm = false; mob = null; renderTop(); }); await q.waitForTimeout(1200); });
  await shot('shot-3-gacha', async q => { await q.click('[data-tab="gear"]'); await q.evaluate(() => { Math.random = (() => { let k = 0; const seq = [0.002, 0.5, 0.02, 0.3, 0.08, 0.8, 0.3, 0.2, 0.6, 0.5, 0.9, 0.1, 0.2, 0.6, 0.05, 0.4, 0.7, 0.2, 0.5, 0.9, 0.95, 0.3]; return () => seq[k++ % seq.length]; })(); gacha(11); }); });
  await shot('shot-4-rebirth', async q => { await q.click('[data-tab="soul"]'); });
  await shot('shot-5-quest', async q => { await q.click('[data-tab="quest"]'); });
  await b.close();
})();
