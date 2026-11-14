'use strict';
/* 게임: 장인 공방 (오리지널 생산 엔진 게임) */
const WS = (() => {
  const RES = ['wood', 'clay', 'iron', 'silk'];
  const RNAME = { wood: '나무', clay: '흙', iron: '쇠', silk: '비단' };
  const GOAL = 15, CAP = 10, MAX_ROUNDS = 30;
  // 공방 카드: [이름, 비용, 생산, 점수]
  const W = [
    ['목공소', { wood: 2 }, 'wood', 0], ['옹기 가마', { clay: 2 }, 'clay', 0], ['풀무간', { iron: 2 }, 'iron', 0], ['누에 치는 집', { silk: 2 }, 'silk', 0],
    ['장작 패는 곳', { clay: 1, iron: 1 }, 'wood', 0], ['흙벽돌 마당', { wood: 1, silk: 1 }, 'clay', 0], ['광산 움막', { wood: 1, clay: 1 }, 'iron', 0], ['뽕나무밭', { clay: 1, iron: 1 }, 'silk', 0],
    ['나무 창고', { wood: 1, clay: 1, silk: 1 }, 'wood', 1], ['기와 굽는 집', { clay: 2, wood: 1 }, 'clay', 1], ['대장간', { iron: 2, wood: 1 }, 'iron', 1], ['베틀방', { silk: 2, clay: 1 }, 'silk', 1],
    ['장승 조각소', { wood: 3, iron: 1 }, 'wood', 2], ['청자 가마', { clay: 3, silk: 1 }, 'clay', 2], ['칼 벼리는 집', { iron: 3, clay: 1 }, 'iron', 2], ['염색집', { silk: 3, wood: 1 }, 'silk', 2],
    ['한지 공방', { wood: 2, silk: 2 }, 'any', 2], ['유기 공방', { iron: 2, clay: 2 }, 'any', 2],
    ['범종 주조소', { iron: 4, wood: 2 }, null, 4], ['단청 화원', { silk: 3, clay: 3 }, null, 4], ['거북선 도면방', { wood: 4, iron: 3 }, null, 5], ['금관 공방', { iron: 3, silk: 3, clay: 1 }, null, 5],
  ];
  // 장터 의뢰: [이름, 필요 재료, 점수]
  const O = [
    ['잔칫상 그릇', { clay: 3 }, 2], ['혼수 이불', { silk: 3 }, 2], ['농기구 수리', { iron: 2, wood: 1 }, 2], ['초가 지붕', { wood: 3 }, 2],
    ['사또 행차 가마', { wood: 2, silk: 2 }, 3], ['장독대', { clay: 4 }, 3], ['갓 스무 개', { silk: 2, wood: 2 }, 3], ['성문 빗장', { iron: 4 }, 3],
    ['왕실 진상품', { silk: 2, iron: 2, clay: 1 }, 4], ['큰 장날 좌판', { wood: 2, clay: 2, iron: 1, silk: 1 }, 4],
  ];
  const cards = W.map((w, i) => ({ id: 'w' + i, name: w[0], cost: w[1], prod: w[2], pts: w[3] }));
  const orders = O.map((o, i) => ({ id: 'o' + i, name: o[0], need: o[1], pts: o[2] }));
  const byId = Object.fromEntries(cards.concat(orders).map(c => [c.id, c]));
  const cur = s => s.players[s.turn].id;
  const total = r => RES.reduce((t, k) => t + (r[k] || 0), 0);
  const canPay = (r, cost) => RES.every(k => (r[k] || 0) >= (cost[k] || 0));
  const pay = (r, cost) => RES.forEach(k => r[k] -= (cost[k] || 0));
  const points = (s, pid) => s.built[pid].reduce((t, id) => t + byId[id].pts, 0) + s.delivered[pid].reduce((t, id) => t + byId[id].pts, 0);

  function produce(s, pid) {
    const r = s.res[pid], got = [];
    s.built[pid].forEach(id => { const p = byId[id].prod; if (!p) return;
      const k = p === 'any' ? RES.slice().sort((a, b) => (r[a] || 0) - (r[b] || 0))[0] : p;  // 만능: 가장 적은 재료
      if (total(r) < CAP) { r[k] = (r[k] || 0) + 1; got.push(k); } });
    s.lastProd = { pid, got };
  }
  function start(s0) {
    const s = clone(s0), n = s.players.length;
    const tier = c => c.pts >= 4 ? 3 : c.pts >= 1 ? 2 : 1;
    s.deck = { 1: shuffle(cards.filter(c => tier(c) === 1).map(c => c.id)), 2: shuffle(cards.filter(c => tier(c) === 2).map(c => c.id)), 3: shuffle(cards.filter(c => tier(c) === 3).map(c => c.id)) };
    s.market = { 1: s.deck[1].splice(-2), 2: s.deck[2].splice(-2), 3: s.deck[3].splice(-2) };
    s.orderDeck = shuffle(orders.map(o => o.id)); s.orders = s.orderDeck.splice(-3);
    s.res = {}; s.built = {}; s.delivered = {};
    s.players.forEach((p, i) => { s.res[p.id] = { wood: 1, clay: 1, iron: 1, silk: 1 }; s.built[p.id] = []; s.delivered[p.id] = [];
      if (i >= Math.ceil(n / 2)) s.res[p.id][RES[i % 4]] += 1; });  // 늦게 시작하는 사람 보정
    Object.assign(s, { turn: 0, status: 'play', lastRound: false, winner: null, log: [], lastProd: null, round: 1 });
    pushLog(s, null, `게임 시작! 먼저 ${GOAL}점을 넘기면 그 바퀴가 끝날 때 게임이 끝나요`);
    return s;
  }
  function endTurn(s, pid) {
    if (!s.lastRound && points(s, pid) >= GOAL) { s.lastRound = true; pushLog(s, pid, `${GOAL}점 돌파! 이번 바퀴가 마지막이에요`); }
    const empty = !s.orders.length && ![1, 2, 3].some(t => s.market[t].length);
    if (!s.lastRound && (empty || s.round >= MAX_ROUNDS)) { s.lastRound = true; pushLog(s, null, empty ? '장터가 텅 비어 이번 바퀴가 마지막이에요' : `${MAX_ROUNDS}바퀴째라 이번 바퀴가 마지막이에요`); }
    s.turn = (s.turn + 1) % s.players.length;
    if (s.turn === 0) s.round = (s.round || 1) + 1;
    if (s.lastRound && s.turn === 0) {
      s.status = 'end';
      s.winner = s.players.map(p => p.id).sort((a, b) => points(s, b) - points(s, a) || s.built[b].length - s.built[a].length)[0];
      pushLog(s, s.winner, '최고의 장인이 되었어요!'); return s;
    }
    produce(s, cur(s)); return s;
  }
  function act(st, pid, type, a = {}) {
    const s = clone(st);
    if (s.status !== 'play') throw Error('게임이 끝났어요');
    if (cur(s) !== pid) throw Error('내 차례가 아니에요');
    const r = s.res[pid];
    if (type === 'take') {
      const picks = a.res || []; if (picks.length !== 2 || picks.some(k => !RES.includes(k))) throw Error('재료 2개를 고르세요');
      let n = 0; picks.forEach(k => { if (total(r) < CAP) { r[k]++; n++; } });
      pushLog(s, pid, `${josa(picks.map(k => RNAME[k]).join('·'), '을', '를')} 받았어요${n < 2 ? ` (창고가 가득 차 ${n}개만)` : ''}`);
      return endTurn(s, pid);
    }
    if (type === 'trade') {
      const { give, get } = a; if (!RES.includes(give) || !RES.includes(get) || give === get) throw Error('바꿀 재료를 고르세요');
      if ((r[give] || 0) < 2) throw Error(`${josa(RNAME[give], '이', '가')} 2개 있어야 해요`);
      r[give] -= 2; r[get] = (r[get] || 0) + 1;
      pushLog(s, pid, `${RNAME[give]} 2개를 ${RNAME[get]} 1개로 바꿨어요`);
      return endTurn(s, pid);
    }
    if (type === 'build') {
      const tierKey = Object.keys(s.market).find(t => s.market[t].includes(a.card)); if (!tierKey) throw Error('장터에 없는 공방이에요');
      const c = byId[a.card]; if (!canPay(r, c.cost)) throw Error('재료가 모자라요');
      pay(r, c.cost); s.built[pid].push(c.id);
      s.market[tierKey] = s.market[tierKey].filter(x => x !== c.id); if (s.deck[tierKey].length) s.market[tierKey].push(s.deck[tierKey].pop());
      pushLog(s, pid, `「${josa(c.name, '」을', '」를').replace(/」(을|를)$/, '」$1')} 지었어요${c.pts ? ` (+${c.pts}점)` : ''}`);
      return endTurn(s, pid);
    }
    if (type === 'deliver') {
      if (!s.orders.includes(a.order)) throw Error('그런 의뢰는 없어요');
      const o = byId[a.order]; if (!canPay(r, o.need)) throw Error('재료가 모자라요');
      pay(r, o.need); s.delivered[pid].push(o.id);
      s.orders = s.orders.filter(x => x !== o.id); if (s.orderDeck.length) s.orders.push(s.orderDeck.pop());
      pushLog(s, pid, `「${o.name}」 의뢰를 납품했어요 (+${o.pts}점)`);
      return endTurn(s, pid);
    }
    throw Error('알 수 없는 행동');
  }
  return { start, act, byId, RES, RNAME, GOAL, CAP, cur, points, canPay, total };
})();

(() => {
const Res = ({ k, n }) => html`<span class=${'res ' + k}>${WS.RNAME[k]}${n != null ? ' ' + n : ''}</span>`;
const Cost = ({ cost }) => html`<span class="row" style="gap:4px;flex-wrap:wrap">${WS.RES.filter(k => cost[k]).map(k => html`<${Res} key=${k} k=${k} n=${cost[k]} />`)}</span>`;
function Rules({ onClose }) {
  return html`<${Overlay} onClose=${onClose}><div class="rules">
    <h2>장인 공방 규칙</h2>
    <p><b>목표:</b> 공방을 지어 재료가 저절로 들어오게 만들고, 장터 의뢰를 납품해서 점수를 모아요. 누군가 <b>${WS.GOAL}점</b>을 넘기면 그 바퀴 끝에 게임이 끝나고, 점수가 가장 높은 사람이 이겨요. 2~4명이 함께 해요.</p>
    <h3>재료</h3><p><${Res} k="wood" /> <${Res} k="clay" /> <${Res} k="iron" /> <${Res} k="silk" /> 네 가지. 한 사람이 최대 ${WS.CAP}개까지 가질 수 있어요.</p>
    <h3>내 차례가 오면</h3><ul><li>먼저 <b>내 공방들이 재료를 1개씩 만들어 줘요</b> (자동). '만능' 공방은 가장 적은 재료를 만들어요.</li>
      <li>그다음 아래 중 하나를 해요.<ul><li><b>재료 받기:</b> 아무 재료 2개 (같은 것 2개도 돼요)</li>
        <li><b>공방 짓기:</b> 장터의 공방 1개를 비용을 내고 지어요. 생산 공방은 다음 차례부터 재료를 만들고, 큰 공방은 점수를 줘요.</li>
        <li><b>의뢰 납품:</b> 장터 의뢰에 적힌 재료를 내고 점수를 받아요.</li>
        <li><b>재료 교환:</b> 같은 재료 2개를 내고 원하는 재료 1개를 받아요. 창고가 꽉 찼을 때 유용해요.</li></ul></li></ul>
    <p class="small muted">장터 공방과 의뢰가 모두 떨어지거나 ${30}바퀴가 지나면 그 바퀴 끝에 게임이 끝나요.</p>
    <h3>팁</h3><p>초반에는 생산 공방을 빨리 지어 재료가 저절로 쌓이게 하고, 후반에는 큰 공방과 의뢰로 점수를 쓸어 담으세요.</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" style="flex:1" onClick=${onClose}>알겠어요</button></div></div><//>`;
}
function Board({ room: s, me, busy, act, nameOf, isHost, close, restart }) {
  const myId = me.id, myTurn = s.status === 'play' && WS.cur(s) === myId, r = s.res[myId] || {};
  const [take, setTake] = useState([]);
  const [trade, setTrade] = useState(['wood', 'iron']);
  useEffect(() => setTake([]), [s.ver]);
  const prodLine = pid => { const c = {}; s.built[pid].forEach(id => { const p = WS.byId[id].prod; if (p) c[p] = (c[p] || 0) + 1; }); return c; };
  const Workshop = ({ id, tier }) => { const c = WS.byId[id], ok = myTurn && WS.canPay(r, c.cost);
    return html`<button type="button" class=${'wcard' + (ok ? ' can' : '')} disabled=${!ok || busy} onClick=${() => act('build', { card: id })}>
      <h4>${c.name}</h4><${Cost} cost=${c.cost} />
      <span class="small">${c.prod ? html`생산: ${c.prod === 'any' ? '만능 (가장 적은 재료)' : html`<${Res} k=${c.prod} />`}` : '생산 없음'}${c.pts ? html` · <b>${c.pts}점</b>` : null}</span></button>`; };
  return html`<div class="stack">
    <div class="opps">${s.players.filter(p => p.id !== myId).map(p => { const pl = prodLine(p.id);
      return html`<div key=${p.id} class=${'opp' + (s.status === 'play' && WS.cur(s) === p.id ? ' turn' : '')}>
        <div class="row" style="justify-content:space-between"><span class="name"><span>${p.nick}</span></span><span class="small"><span class="score">${WS.points(s, p.id)}</span>점 · 공방 ${s.built[p.id].length}</span></div>
        <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:4px">${WS.RES.map(k => html`<${Res} key=${k} k=${k} n=${s.res[p.id][k]} />`)}
          <span class="small muted">생산 ${Object.entries(pl).map(([k, n]) => `${k === 'any' ? '만능' : WS.RNAME[k]}${n}`).join(' ') || '없음'}</span></div></div>`; })}</div>
    <div class="status" role="status">${s.status === 'end' ? `${nameOf(s.winner)} 승리!` : myTurn ? '재료 받기 · 공방 짓기 · 의뢰 납품 중 하나를 하세요' : `${nameOf(WS.cur(s))}의 차례`}${s.lastRound && s.status === 'play' ? ' · 마지막 바퀴!' : ''}</div>
    ${myTurn && s.lastProd?.pid === myId && s.lastProd.got.length ? html`<p class="small" style="text-align:center;margin:0">내 공방이 만들어 준 재료: ${s.lastProd.got.map((k, i) => html`<${Res} key=${i} k=${k} /> `)}</p>` : null}
    <div class=${'me' + (myTurn ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><b>${nameOf(myId)} (나)</b><span class="small"><span class="score">${WS.points(s, myId)}</span> / ${WS.GOAL}점</span></div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:8px 0">${WS.RES.map(k => html`<${Res} key=${k} k=${k} n=${r[k]} />`)}<span class="small muted">(${WS.total(r)}/${WS.CAP})</span></div>
      <div class="small muted">내 공방: ${s.built[myId].map(id => WS.byId[id].name).join(', ') || '아직 없음'}</div>
      ${myTurn ? html`<div class="stack" style="gap:6px;margin-top:10px"><span class="small"><b>재료 받기</b> — 2개 고르기 (${take.length}/2)</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${WS.RES.map(k => html`<button key=${k} class="btn sm" disabled=${busy || take.length >= 2} onClick=${() => setTake(t => t.concat(k))}>+ ${WS.RNAME[k]}</button>`)}</div>
        ${take.length ? html`<div class="row"><span class="small">고른 것: ${take.map(k => WS.RNAME[k]).join(', ')}</span><button class="btn sm ghost" onClick=${() => setTake([])}>다시</button></div>` : null}
        <button class="btn jade" disabled=${busy || take.length !== 2} onClick=${() => act('take', { res: take })}>재료 받기</button>
        <span class="small" style="margin-top:6px"><b>재료 교환</b> — 같은 재료 2개 → 원하는 재료 1개</span>
        <div class="row" style="gap:6px">
          <select id="tradeGive" class="btn sm" value=${trade[0]} onChange=${e => setTrade([e.target.value, trade[1]])}>${WS.RES.map(k => html`<option key=${k} value=${k}>${WS.RNAME[k]} 2개</option>`)}</select>
          <span>→</span>
          <select id="tradeGet" class="btn sm" value=${trade[1]} onChange=${e => setTrade([trade[0], e.target.value])}>${WS.RES.map(k => html`<option key=${k} value=${k}>${WS.RNAME[k]} 1개</option>`)}</select>
          <button class="btn sm" disabled=${busy || (r[trade[0]] || 0) < 2 || trade[0] === trade[1]} onClick=${() => act('trade', { give: trade[0], get: trade[1] })}>바꾸기</button></div></div>` : null}
    </div>
    <span class="small muted">장터 의뢰 (재료를 내고 점수)</span>
    <div class="grid2">${s.orders.map(id => { const o = WS.byId[id], ok = myTurn && WS.canPay(r, o.need);
      return html`<button key=${id} type="button" class=${'wcard' + (ok ? ' can' : '')} disabled=${!ok || busy} onClick=${() => act('deliver', { order: id })}>
        <h4>${o.name}</h4><${Cost} cost=${o.need} /><b>${o.pts}점</b></button>`; })}</div>
    <span class="small muted">장터 공방 (지으면 내 것)</span>
    <div class="grid2">${[1, 2, 3].flatMap(t => s.market[t].map(id => html`<${Workshop} key=${id} id=${id} tier=${t} />`))}</div>
    <${LogList} log=${s.log} nameOf=${nameOf} />
    ${s.status === 'end' ? html`<${Overlay}><h2>🏆 ${nameOf(s.winner)} 승리!</h2>
      <table class="result"><thead><tr><th>이름</th><th>점수</th><th>공방</th><th>의뢰</th></tr></thead><tbody>
        ${s.players.slice().sort((a, b) => WS.points(s, b.id) - WS.points(s, a.id)).map(p => html`<tr key=${p.id}><td>${p.nick}</td><td class="score">${WS.points(s, p.id)}</td><td>${s.built[p.id].length}</td><td>${s.delivered[p.id].length}</td></tr>`)}</tbody></table>
      ${isHost ? html`<div class="row"><button class="btn primary" style="flex:1" disabled=${busy} onClick=${restart}>한 판 더</button><button class="btn" onClick=${close}>방 닫기</button></div>` : html`<p class="small muted">방장이 다음 판을 시작하기를 기다려요</p>`}<//>` : null}
  </div>`;
}
function Icon() { return html`<div class="stack" style="gap:4px;justify-items:center"><span class="row" style="gap:3px"><${Res} k="wood" /><${Res} k="iron" /></span><span class="row" style="gap:3px"><${Res} k="clay" /><${Res} k="silk" /></span></div>`; }
GAMES.push({ id: 'workshop', name: '장인 공방', who: '2~4명 · 25분', min: 2, max: 4, blurb: '공방을 지어 재료가 저절로 들어오게 하고, 장터 의뢰를 납품해 점수를 모으는 생산 게임',
  start: WS.start, act: WS.act, Board, Rules, Icon });
})();
