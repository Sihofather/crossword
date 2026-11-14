'use strict';
/* 게임: 도깨비 방망이 (전래 '러미' 방식 숫자 타일 게임, 오리지널 규칙) */
const TIL = (() => {
  const COLORS = ['청', '적', '황', '백', '흑'];
  const MAXN = 10, START = 14, OPEN = 20, WILD_PENALTY = 15;
  const make = () => { const t = []; for (let c = 0; c < 5; c++) for (let n = 1; n <= MAXN; n++) for (let k = 0; k < 2; k++) t.push(`t${c}-${n}-${k}`); return t.concat(['w0', 'w1']); };
  const info = id => id[0] === 'w' ? { wild: true } : { c: +id.slice(1, id.indexOf('-')), n: +id.split('-')[1] };
  const cur = s => s.players[s.turn].id;
  // 조합 판정: 같은 숫자 다른 색 3~5개(그룹) 또는 같은 색 연속 숫자 3개 이상(줄). 방망이 타일은 만능
  function meld(ids) {
    if (ids.length < 3) return null;
    const t = ids.map(info), w = t.filter(x => x.wild).length, p = t.filter(x => !x.wild);
    if (!p.length) return null;
    if (p.every(x => x.n === p[0].n) && new Set(p.map(x => x.c)).size === p.length && ids.length <= 5)
      return { kind: 'group', value: p[0].n * ids.length };
    if (p.every(x => x.c === p[0].c)) {
      const ns = p.map(x => x.n).sort((a, b) => a - b);
      if (new Set(ns).size !== ns.length) return null;
      const len = ids.length, need = ns[ns.length - 1] - ns[0] + 1 - ns.length;
      if (need > w || len > MAXN) return null;
      const startN = Math.max(1, Math.min(ns[0], MAXN - len + 1));
      if (startN + len - 1 < ns[ns.length - 1]) return null;
      let v = 0; for (let k = 0; k < len; k++) v += startN + k;
      return { kind: 'run', value: v };
    }
    return null;
  }
  function start(s0) {
    const s = clone(s0); s.pool = shuffle(make()); s.racks = {}; s.opened = {};
    s.players.forEach(p => { s.racks[p.id] = s.pool.splice(-START); s.opened[p.id] = false; });
    Object.assign(s, { melds: [], turn: Math.floor(Math.random() * s.players.length), passes: 0, status: 'play', winner: null, log: [] });
    pushLog(s, null, `게임 시작! 처음 내려놓을 때는 합이 ${OPEN} 이상이어야 해요`);
    return s;
  }
  const rackSum = (s, pid) => s.racks[pid].reduce((t, id) => t + (info(id).wild ? WILD_PENALTY : info(id).n), 0);
  function finish(s, winner) {
    s.status = 'end'; s.winner = winner;
    s.final = Object.fromEntries(s.players.map(p => [p.id, rackSum(s, p.id)]));
  }
  function act(st, pid, type, a = {}) {
    const s = clone(st);
    if (s.status !== 'play') throw Error('게임이 끝났어요');
    if (cur(s) !== pid) throw Error('내 차례가 아니에요');
    const rack = s.racks[pid];
    if (type === 'play') {
      const newMelds = a.newMelds || [], adds = a.adds || [];
      const used = newMelds.flat().concat(adds.flatMap(x => x.tiles));
      if (!used.length) throw Error('내려놓을 타일이 없어요');
      if (new Set(used).size !== used.length || used.some(id => !rack.includes(id))) throw Error('타일이 맞지 않아요');
      let openValue = 0;
      for (const m of newMelds) { const r = meld(m); if (!r) throw Error('조합이 맞지 않아요'); openValue += r.value; }
      if (!s.opened[pid]) {
        if (adds.length) throw Error('처음에는 내 타일로만 새 조합을 내려놓아야 해요');
        if (openValue < OPEN) throw Error(`처음 내려놓는 합이 ${OPEN} 이상이어야 해요 (지금 ${openValue})`);
      }
      const melds = s.melds.map(m => m.slice());
      for (const x of adds) { if (!melds[x.m]) throw Error('붙일 조합이 없어요'); melds[x.m] = melds[x.m].concat(x.tiles); if (!meld(melds[x.m])) throw Error('붙인 조합이 맞지 않아요'); }
      s.melds = melds.concat(newMelds); s.racks[pid] = rack.filter(id => !used.includes(id)); s.opened[pid] = true; s.passes = 0;
      pushLog(s, pid, `타일 ${used.length}개를 내려놓았어요${!st.opened[pid] ? ' (첫 등록!)' : ''}`);
      if (!s.racks[pid].length) { finish(s, pid); pushLog(s, pid, '타일을 다 내려놓아 승리!'); return s; }
      s.turn = (s.turn + 1) % s.players.length; return s;
    }
    if (type === 'draw') {
      if (s.pool.length) { rack.push(s.pool.pop()); s.passes = 0; pushLog(s, pid, '타일 1개를 가져왔어요'); }
      else {
        s.passes++; pushLog(s, pid, '가져올 타일이 없어 넘겼어요');
        if (s.passes >= s.players.length) { const w = s.players.map(p => p.id).sort((x, y) => rackSum(s, x) - rackSum(s, y))[0]; finish(s, w); pushLog(s, w, '남은 타일 합이 가장 적어 승리!'); return s; }
      }
      s.turn = (s.turn + 1) % s.players.length; return s;
    }
    throw Error('알 수 없는 행동');
  }
  return { start, act, meld, info, cur, COLORS, OPEN, rackSum, make, START };
})();

(() => {
function Tile({ id, sel, staged, onClick, size }) {
  const t = TIL.info(id), style = size ? `--w:${size}px` : '';
  return html`<button type="button" class=${'tile ' + (t.wild ? 'wild' : 'c' + t.c) + (sel ? ' sel' : '') + (staged ? ' staged' : '')} style=${style}
    onClick=${onClick} disabled=${!onClick} aria-label=${t.wild ? '방망이 타일' : `${TIL.COLORS[t.c]} ${t.n}`}>${t.wild ? '방' : t.n}</button>`;
}
function Rules({ onClose }) {
  return html`<${Overlay} onClose=${onClose}><div class="rules">
    <h2>도깨비 방망이 규칙</h2>
    <p><b>목표:</b> 내 타일을 가장 먼저 모두 내려놓으면 이겨요. 2~4명이 함께 해요.</p>
    <h3>타일</h3><p>오방색 다섯 가지(청·적·황·백·흑) × 숫자 1~10 × 2벌, 그리고 아무 타일로나 쓸 수 있는 <b>방망이 타일</b> 2개. 처음에 ${TIL.START}개씩 받아요.</p>
    <h3>조합</h3><ul><li><b>모둠:</b> 같은 숫자, 서로 다른 색 3~5개 (예: 청7 적7 흑7)</li>
      <li><b>줄:</b> 같은 색, 이어진 숫자 3개 이상 (예: 황3 황4 황5 황6)</li></ul>
    <h3>내 차례</h3><ul><li>타일을 골라 <b>새 조합</b>을 만들거나, 판에 있는 조합에 <b>붙여요</b>. 여러 개를 한 번에 해도 돼요. 끝나면 <b>내려놓기 완료</b>.</li>
      <li>내려놓을 게 없으면 <b>타일 가져오기</b>로 1개를 가져가고 차례를 마쳐요.</li>
      <li><b>처음 내려놓을 때</b>는 내 타일로만 만든 새 조합의 숫자 합이 ${TIL.OPEN} 이상이어야 해요. 그 다음부터는 아무 조합에나 붙일 수 있어요.</li></ul>
    <p class="small muted">가져올 타일이 다 떨어지고 모두 한 번씩 넘기면, 남은 타일 합이 가장 적은 사람이 이겨요 (방망이 타일은 15점).</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" style="flex:1" onClick=${onClose}>알겠어요</button></div></div><//>`;
}
function Board({ room: s, me, busy, act, nameOf, isHost, say, close, restart }) {
  const myId = me.id, myTurn = s.status === 'play' && TIL.cur(s) === myId;
  const [sel, setSel] = useState([]);
  const [plan, setPlan] = useState({ newMelds: [], adds: [] });
  useEffect(() => { setSel([]); setPlan({ newMelds: [], adds: [] }); }, [s.ver]);
  const staged = new Set(plan.newMelds.flat().concat(plan.adds.flatMap(x => x.tiles)));
  const rack = (s.racks[myId] || []).filter(id => !staged.has(id)).sort((a, b) => { const x = TIL.info(a), y = TIL.info(b); return (x.wild ? 9 : x.c) - (y.wild ? 9 : y.c) || (x.n || 0) - (y.n || 0); });
  const toggle = id => setSel(x => x.includes(id) ? x.filter(y => y !== id) : x.concat(id));
  const makeNew = () => { const r = TIL.meld(sel); if (!r) return say('모둠(같은 숫자·다른 색 3~5개)이나 줄(같은 색 이어진 숫자 3개+)이 아니에요');
    setPlan(p => ({ ...p, newMelds: p.newMelds.concat([sel]) })); setSel([]); };
  const addTo = i => { if (!sel.length) return; if (!s.opened[myId]) return say(`처음에는 내 타일로 합 ${TIL.OPEN} 이상의 새 조합을 내야 해요`);
    const already = plan.adds.filter(x => x.m === i).flatMap(x => x.tiles);
    if (!TIL.meld(s.melds[i].concat(already, sel))) return say('그 조합에는 붙일 수 없어요');
    setPlan(p => ({ ...p, adds: p.adds.concat([{ m: i, tiles: sel }]) })); setSel([]); };
  const openSum = plan.newMelds.reduce((t, m) => t + (TIL.meld(m)?.value || 0), 0);
  const hasPlan = plan.newMelds.length || plan.adds.length;
  return html`<div class="stack">
    <div class="opps">${s.players.filter(p => p.id !== myId).map(p => html`<div key=${p.id} class=${'opp' + (s.status === 'play' && TIL.cur(s) === p.id ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><span class="name"><span>${p.nick}</span>${s.opened[p.id] ? html`<span class="chip">등록</span>` : null}</span><span class="small">타일 ${s.racks[p.id].length}개</span></div></div>`)}</div>
    <div class="stack" style="gap:6px"><span class="small muted">판 위 조합 (${s.melds.length}) · 남은 타일 ${s.pool.length}개</span>
      <div class="row" style="flex-wrap:wrap;gap:6px">${s.melds.length === 0 && !plan.newMelds.length ? html`<span class="small muted">아직 아무것도 없어요</span>` : null}
        ${s.melds.map((m, i) => { const extra = plan.adds.filter(x => x.m === i).flatMap(x => x.tiles);
          return html`<div key=${i} class=${'meld' + (myTurn && sel.length ? ' pick' : '')} onClick=${myTurn && sel.length ? () => addTo(i) : null}>
            ${m.concat(extra).map(id => html`<${Tile} key=${id} id=${id} size=${26} staged=${extra.includes(id)} />`)}</div>`; })}
        ${plan.newMelds.map((m, i) => html`<div key=${'n' + i} class="meld" style="border-style:dashed;border-color:var(--jade)">${m.map(id => html`<${Tile} key=${id} id=${id} size=${26} staged />`)}</div>`)}
      </div></div>
    <div class="status" role="status">${s.status === 'end' ? `${nameOf(s.winner)} 승리!` : myTurn ? (sel.length ? '새 조합으로 만들거나, 붙일 조합을 누르세요' : hasPlan ? '더 내거나 내려놓기 완료를 누르세요' : '타일을 골라 조합을 만들거나 1개 가져오세요') : `${nameOf(TIL.cur(s))}의 차례`}</div>
    <div class=${'me' + (myTurn ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><b>${nameOf(myId)} (나) · ${(s.racks[myId] || []).length}개</b><span class="small muted">${s.opened[myId] ? '등록 완료' : `첫 등록: 합 ${openSum}/${TIL.OPEN}`}</span></div>
      <div class="row" style="flex-wrap:wrap;gap:5px;justify-content:center;padding-top:8px">${rack.map(id => html`<${Tile} key=${id} id=${id} sel=${sel.includes(id)} onClick=${myTurn && !busy ? () => toggle(id) : null} />`)}</div>
      ${myTurn ? html`<div class="actions">
        <button class="btn jade" disabled=${busy || sel.length < 3} onClick=${makeNew}>새 조합 만들기</button>
        <button class="btn" disabled=${busy || !hasPlan} onClick=${() => { setPlan({ newMelds: [], adds: [] }); setSel([]); }}>되돌리기</button>
        <button class="btn primary" disabled=${busy || !hasPlan} onClick=${() => act('play', plan)}>내려놓기 완료</button>
        <button class="btn" disabled=${busy || hasPlan} onClick=${() => act('draw')}>${s.pool.length ? '타일 가져오기' : '넘기기'}</button></div>` : null}
    </div>
    <${LogList} log=${s.log} nameOf=${nameOf} />
    ${s.status === 'end' ? html`<${Overlay}><h2>🏆 ${nameOf(s.winner)} 승리!</h2>
      <table class="result"><thead><tr><th>이름</th><th>남은 타일</th><th>남은 합</th></tr></thead><tbody>${s.players.map(p => html`<tr key=${p.id}><td>${p.nick}</td><td>${s.racks[p.id].length}개</td><td>${s.final[p.id]}</td></tr>`)}</tbody></table>
      ${isHost ? html`<div class="row"><button class="btn primary" style="flex:1" disabled=${busy} onClick=${restart}>한 판 더</button><button class="btn" onClick=${close}>방 닫기</button></div>` : html`<p class="small muted">방장이 다음 판을 시작하기를 기다려요</p>`}<//>` : null}
  </div>`;
}
function Icon() { return html`<div class="row" style="gap:3px"><${Tile} id="t0-7-0" size=${24} /><${Tile} id="t1-7-0" size=${24} /><${Tile} id="w0" size=${24} /></div>`; }
GAMES.push({ id: 'tiles', name: '도깨비 방망이', who: '2~4명 · 20분', min: 2, max: 4, blurb: '오방색 숫자 타일로 같은 숫자 모둠과 이어진 줄을 만들어 먼저 다 내려놓는 게임',
  start: TIL.start, act: TIL.act, Board, Rules, Icon });
})();
