// 밸런스 시뮬레이터: node balance-sim.js
// index.html 의 밸런스 함수(B)를 그대로 읽어 '성실한 플레이어'의 진행 속도를 계산합니다.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/www/index.html', 'utf8');
const a = html.indexOf('const B = {'), b = html.indexOf('/* =====================================================================\n   상태 / 저장');
const { B, TIERS } = new Function(html.slice(a, b) + '; return { B, TIERS };')();

function sim({ hours = 24, gemsPerHour = 120, adBuffs = true, label }) {
  let gold = 0, gems = 100, souls = 0, stage = 1, wave = 1, maxStage = 1;
  const lv = { atk: 0, spd: 0, crit: 0, critd: 0, gold: 0 }, inv = {}; let equip = -1;
  let stuckSince = 0, t = 0; const dt = 1, log = []; const marks = [600, 1800, 3600, 3 * 3600, 6 * 3600, 12 * 3600, 24 * 3600, 72 * 3600];
  let mi = 0, rebirths = 0, best = 0;
  const owned = () => Object.keys(inv).reduce((s, i) => s + B.ownedBonus(+i), 0);
  const atkV = () => B.baseAtk(lv.atk) * B.soulMult(souls) * B.equipMult(equip) * (1 + owned()) * (adBuffs ? 2 : 1);
  const apsV = () => (1 + 0.04 * lv.spd) * (adBuffs ? 1.5 : 1);
  const dpsV = () => atkV() * apsV() * (1 + (5 + lv.crit) / 100 * (0.5 + lv.critd * 0.12)) + atkV() * 8 / 8;
  const gm = () => (1 + 0.1 * lv.gold) * B.soulMult(souls) * (adBuffs ? 2 : 1);
  let farm = false;
  while (t < hours * 3600) {
    t += dt;
    gems += gemsPerHour / 3600;
    if (gems >= 500) { gems -= 500; for (let k = 0; k < 11; k++) { let r = Math.random(), tt = 0; for (let i = 5; i >= 0; i--) { if (r < TIERS[i].p) { tt = i; break; } r -= TIERS[i].p; } const w = tt * 4 + Math.floor(Math.random() * 4); inv[w] = (inv[w] || 0) + 1; }
      for (let i = 0; i < 23; i++) while ((inv[i] || 0) >= 5) { inv[i] -= 4; inv[i + 1] = (inv[i + 1] || 0) + 1; }
      equip = Math.max(...Object.keys(inv).map(Number)); }
    const d = dpsV();
    if (!farm && wave === 10) {
      const hp = B.hp(stage, 10);
      if (d * B.bossTime >= hp) { const g = B.goldDrop(stage, 10) * gm(); gold += g; gems += 1; if (stage >= maxStage) gems += 10 + Math.floor(stage / 2); stage++; wave = 1; maxStage = Math.max(maxStage, stage); best = Math.max(best, stage); stuckSince = t; t += Math.min(hp / d, 30); }
      else { farm = true; t += B.bossTime; }
    } else {
      const w = farm ? 9 : wave, hp = B.hp(stage, w), kt = Math.max(hp / d, 1 / apsV()) + 0.35;
      gold += B.goldDrop(stage, w) * gm() * (dt / kt);
      if (!farm && dt / kt >= 1) wave = Math.min(10, wave + Math.floor(dt / kt));
      else if (!farm) { wave++; t += kt - dt; }
      if (farm && d * B.bossTime > B.hp(stage, 10) * 1.05) { farm = false; wave = 10; }
    }
    // 업그레이드: 공격력 대비 효율 좋은 것부터
    for (let n = 0; n < 200; n++) {
      const opts = [['atk', ((2 + lv.atk) / (1 + lv.atk)) * 1.045], ['spd', lv.spd < 50 ? (1 + 0.04 * (lv.spd + 1)) / (1 + 0.04 * lv.spd) : 0], ['critd', 1.03], ['crit', lv.crit < 45 ? 1.03 : 0], ['gold', 1.1]];
      let best = null, be = 0; for (const [k, gain] of opts) { if (!gain) continue; const c = B.cost(k, lv[k]); const e = (gain - 1) / c; if (e > be && c <= gold) { be = e; best = k; } }
      if (!best) break; gold -= B.cost(best, lv[best]); lv[best]++;
    }
    // 환생: 30분 이상 막히면
    if (t - stuckSince > 1800 && B.soulsFor(maxStage) >= Math.max(souls * 0.5, 3)) {
      souls += B.soulsFor(maxStage); rebirths++; gold = 0; stage = 1; wave = 1; maxStage = 1; farm = false; for (const k in lv) lv[k] = 0; stuckSince = t;
    }
    if (t >= marks[mi]) { log.push(`${(marks[mi] / 3600).toFixed(1).padStart(5)}h  최고 스테이지 ${String(best).padStart(4)}  영혼석 ${String(Math.round(souls)).padStart(12)}  환생 ${String(rebirths).padStart(2)}회  최고무기 ${equip}`); mi++; }
  }
  console.log('\n## ' + label); log.forEach(l => console.log(l));
}
sim({ label: '무과금 · 광고 버프 사용', gemsPerHour: 60, adBuffs: true, hours: 72 });
sim({ label: '무과금 · 광고 안 봄', gemsPerHour: 40, adBuffs: false, hours: 72 });
sim({ label: '소과금(월정액+스타터)', gemsPerHour: 200, adBuffs: true, hours: 72 });
