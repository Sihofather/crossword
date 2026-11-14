'use strict';
/* 게임: 도깨비 장담 (전래 '오 헬' 방식 장담 카드게임 + 오리지널 특수 카드) */
const BET = (() => {
  const COLORS = ['청', '적', '황', '백'], ROUNDS = 7;
  const deck = () => { const d = []; for (let c = 0; c < 4; c++) for (let n = 1; n <= 13; n++) d.push(`${c}-${n}`); return d.concat(['g0', 'g1', 'g2', 'w0', 'w1']); };
  const info = id => id[0] === 'g' ? { sp: 'gamtu' } : id[0] === 'w' ? { sp: 'ssireum' } : { c: +id[0], n: +id.slice(2) };
  const cur = s => s.players[s.turn].id;
  const ledColor = trick => { const f = trick.find(t => !info(t.card).sp); return f ? info(f.card).c : null; };
  function legal(s, pid, card) {
    const hand = s.hands[pid]; if (!hand.includes(card)) return false;
    if (info(card).sp) return true;
    const led = ledColor(s.trick); if (led == null) return true;
    if (hand.some(c => !info(c).sp && info(c).c === led)) return info(card).c === led;
    return true;
  }
  // 한 판(트릭) 승자: 씨름판이 있으면 낸 색 중 가장 낮은 숫자, 아니면 으뜸 색 최고 → 낸 색 최고. 감투는 못 이김
  function trickWinner(trick, trump) {
    const led = ledColor(trick); if (led == null) return trick[0].pid;
    const nums = trick.filter(t => !info(t.card).sp);
    if (trick.some(t => info(t.card).sp === 'ssireum')) return nums.filter(t => info(t.card).c === led).sort((a, b) => info(a.card).n - info(b.card).n)[0].pid;
    const tr = nums.filter(t => info(t.card).c === trump);
    const pool = tr.length ? tr : nums.filter(t => info(t.card).c === led);
    return pool.sort((a, b) => info(b.card).n - info(a.card).n)[0].pid;
  }
  function start(s0) { const s = clone(s0); s.round = 0; s.scores = Object.fromEntries(s.players.map(p => [p.id, 0])); s.log = []; return newRound(s); }
  function newRound(s0) {
    const s = clone(s0); s.round++; const d = shuffle(deck()); s.hands = {};
    s.players.forEach(p => { s.hands[p.id] = d.splice(-s.round); });
    const flip = d.pop(); s.flip = flip; s.trump = info(flip).sp ? null : info(flip).c;
    s.lead = (s.round - 1) % s.players.length; s.turn = s.lead;
    Object.assign(s, { phase: 'bid', bids: {}, won: Object.fromEntries(s.players.map(p => [p.id, 0])), trick: [], lastTrick: null, status: 'play', result: null });
    pushLog(s, null, `${s.round}라운드! 으뜸 색은 ${s.trump == null ? '없음' : COLORS[s.trump]}. 몇 번 이길지 장담하세요`);
    return s;
  }
  function act(st, pid, type, a = {}) {
    const s = clone(st);
    if (type === 'reveal') {
      if (s.phase !== 'bid' || s.status !== 'play') throw Error('장담 시간이 아니에요');
      if (!s.players.every(p => Number.isInteger(s.bids[p.id]) && s.bids[p.id] >= 0 && s.bids[p.id] <= s.round)) throw Error('아직 다 장담하지 않았어요');
      s.phase = 'play'; pushLog(s, null, '장담 공개! ' + s.players.map(p => `{${p.id}} ${s.bids[p.id]}번`).join(', ')); return s;
    }
    if (type === 'next') { if (s.status !== 'roundEnd') throw Error('아직 라운드가 안 끝났어요'); return newRound(s); }
    if (type === 'play') {
      if (s.status !== 'play' || s.phase !== 'play') throw Error('지금은 낼 수 없어요');
      if (cur(s) !== pid) throw Error('내 차례가 아니에요');
      if (!legal(s, pid, a.card)) throw Error('처음 나온 색과 같은 색이 있으면 그 색을 내야 해요');
      s.hands[pid] = s.hands[pid].filter(c => c !== a.card); s.trick.push({ pid, card: a.card });
      if (s.trick.length < s.players.length) { s.turn = (s.turn + 1) % s.players.length; return s; }
      const w = trickWinner(s.trick, s.trump); s.won[w]++; s.lastTrick = { cards: s.trick, winner: w, n: (s.lastTrick?.n || 0) + 1 };
      pushLog(s, w, '이번 판을 가져갔어요'); s.trick = []; s.turn = s.lead = s.players.findIndex(p => p.id === w);
      if (!s.hands[pid].length) {
        const add = {}; s.players.forEach(p => { const b = s.bids[p.id], g = s.won[p.id];
          add[p.id] = b === g ? (b === 0 ? 10 + s.round : 10 + 3 * g) : -3 * Math.abs(b - g); s.scores[p.id] += add[p.id]; });
        s.result = { add }; s.status = s.round >= ROUNDS ? 'gameEnd' : 'roundEnd'; pushLog(s, null, `${s.round}라운드 끝`);
      }
      return s;
    }
    throw Error('알 수 없는 행동');
  }
  return { start, act, legal, trickWinner, info, cur, COLORS, ROUNDS, deck };
})();

(() => {
const CC = ['#2b6fd6', '#d33a3a', '#c99400', '#8a8a8a'];
const SP = { gamtu: ['도깨비 감투', 'spirit', '쓰면 안 보여요. 절대 못 이김'], ssireum: ['씨름판', 'bigdok', '이번 판은 가장 낮은 숫자가 이김'] };
function BCard({ id, size, can, dim, onClick }) {
  const t = BET.info(id); let cls = 'pc ' + (size || 'md') + (can ? ' can' : '') + (dim ? ' dim' : ''), inner;
  if (t.sp) { cls += ' pic'; inner = html`<span class="cr">${SP[t.sp][0]}</span><img src=${ARTURL(SP[t.sp][1])} alt="" /><span class="hint">${SP[t.sp][2]}</span>`; }
  else inner = html`<span class="r" style=${'color:' + CC[t.c]}>${t.n}</span><span class="s" style=${'color:' + CC[t.c] + ';font-size:calc(var(--w)*.3)'}>${BET.COLORS[t.c]}</span>`;
  const el = html`<span class=${cls} aria-label=${t.sp ? SP[t.sp][0] + ' · ' + SP[t.sp][2] : `${BET.COLORS[t.c]} ${t.n}`}>${inner}</span>`;
  return onClick ? html`<button type="button" class="pc-btn" onClick=${onClick}>${el}</button>` : el;
}
function Rules({ onClose }) {
  return html`<${Overlay} onClose=${onClose}><div class="rules">
    <h2>도깨비 장담 규칙</h2>
    <p><b>목표:</b> 라운드마다 "나는 이번에 몇 번 이긴다"를 장담하고 <b>정확히</b> 맞히세요. ${BET.ROUNDS}라운드 뒤 점수가 가장 높은 사람이 이겨요. 2~6명이 함께 해요.</p>
    <h3>진행</h3><ul><li>1라운드는 1장, 2라운드는 2장… ${BET.ROUNDS}라운드는 ${BET.ROUNDS}장씩 받아요.</li>
      <li>덱에서 한 장을 뒤집어 그 색이 이번 라운드의 <b>으뜸 색</b>이 돼요 (특수 카드가 나오면 으뜸 색 없음).</li>
      <li>모두 몰래 장담(0번~받은 장수)을 고르면 한꺼번에 공개돼요.</li>
      <li>돌아가며 1장씩 내요. <b>처음 나온 색이 손에 있으면 그 색을 내야</b> 해요. 없으면 아무거나. 특수 카드는 언제든 낼 수 있어요.</li>
      <li>으뜸 색이 나왔으면 으뜸 색 중 가장 높은 숫자가, 아니면 처음 나온 색 중 가장 높은 숫자가 그 판을 가져가고 다음 판을 시작해요.</li></ul>
    <h3>특수 카드</h3><div class="gallery">${['g0', 'w0'].map(id => { const t = SP[BET.info(id).sp]; return html`<div class="gcard" key=${id}><img src=${ARTURL(t[1])} alt="" /><div><b>${t[0]} (${id === 'g0' ? 3 : 2}장)</b><span>${id === 'g0' ? '쓰면 모습이 안 보이는 감투. 이 카드는 절대 판을 못 이겨요. 이기기 싫을 때 쓰세요.' : '도깨비가 씨름을 걸어요. 이 카드가 나온 판은 처음 나온 색 중 가장 낮은 숫자가 이겨요 (으뜸 색도 소용없음).'}</span></div></div>`; })}</div>
    <h3>점수</h3><ul><li>장담을 <b>딱 맞히면</b> 10점 + 이긴 판마다 3점.</li><li><b>0번 장담</b>을 맞히면 10점 + 라운드 숫자.</li><li>틀리면 차이 1번마다 −3점.</li></ul>
    <div class="row" style="margin-top:12px"><button class="btn primary" style="flex:1" onClick=${onClose}>알겠어요</button></div></div><//>`;
}
function Board({ room: s, me, busy, act, commit, patch, nameOf, isHost, close, restart }) {
  const myId = me.id, hand = (s.hands[myId] || []).slice().sort((a, b) => { const x = BET.info(a), y = BET.info(b); return (x.sp ? 9 : x.c) - (y.sp ? 9 : y.c) || (x.n || 0) - (y.n || 0); });
  const myTurn = s.status === 'play' && s.phase === 'play' && BET.cur(s) === myId;
  const allBid = s.players.every(p => Number.isInteger(s.bids?.[p.id])), myBid = s.bids?.[myId];
  const [showLast, setShowLast] = useState(null);
  // 모두 장담하면 공개 (누구 폰이든 먼저 처리, 중복은 엔진이 거부)
  useEffect(() => { if (s.phase !== 'bid' || !allBid || s.status !== 'play') return;
    const t = setTimeout(() => commit(st => { try { return BET.act(st, myId, 'reveal'); } catch { return null; } }), isHost ? 100 : 600 + Math.random() * 900); return () => clearTimeout(t); }, [allBid, s.phase, s.round]);
  useEffect(() => { if (s.lastTrick && s.lastTrick.n && s.status === 'play') { setShowLast(s.lastTrick); const t = setTimeout(() => setShowLast(null), 2200); return () => clearTimeout(t); } }, [s.lastTrick?.n, s.round]);
  const table = s.trick.length ? s.trick : (showLast ? showLast.cards : []);
  return html`<div class="stack">
    <div class="opps">${s.players.filter(p => p.id !== myId).map(p => html`<div key=${p.id} class=${'opp' + (s.status === 'play' && s.phase === 'play' && BET.cur(s) === p.id ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><span class="name"><span>${p.nick}</span></span>
        <span class="small">${s.phase === 'bid' ? (Number.isInteger(s.bids?.[p.id]) ? '장담 완료' : '고민 중…') : `장담 ${s.bids[p.id]} · 이긴 판 ${s.won[p.id]}`} · <span class="score">${s.scores[p.id]}</span>점</span></div></div>`)}</div>
    <div class="table" style="min-height:130px">
      <div class="pile"><${BCard} id=${s.flip} size="md" /><span class="cap">으뜸: ${s.trump == null ? '없음' : BET.COLORS[s.trump]}</span></div>
      ${table.map(t => html`<div class="pile" key=${t.card}><${BCard} id=${t.card} size="md" /><span class="cap">${nameOf(t.pid)}${!s.trick.length && showLast?.winner === t.pid ? ' ★' : ''}</span></div>`)}
    </div>
    <div class="status" role="status">${s.status !== 'play' ? `${s.round}라운드 끝` : s.phase === 'bid' ? (myBid == null ? '이번 라운드에 몇 번 이길까요?' : '다른 사람의 장담을 기다리는 중…') : !s.trick.length && showLast ? `${josa(nameOf(showLast.winner), "이", "가")} 가져갔어요` : myTurn ? '낼 카드를 누르세요' : `${nameOf(BET.cur(s))}의 차례`}
      <span class="small muted"> · ${s.round}/${BET.ROUNDS}라운드</span></div>
    <div class=${'me' + (myTurn || (s.phase === 'bid' && myBid == null) ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><b>${nameOf(myId)} (나)</b><span class="small">${s.phase === 'play' ? `장담 ${myBid} · 이긴 판 ${s.won[myId]} · ` : ''}<span class="score">${s.scores[myId]}</span>점</span></div>
      <div class="fan">${hand.map(id => { const ok = myTurn && BET.legal(s, myId, id); return html`<${BCard} key=${id} id=${id} can=${ok} dim=${myTurn && !ok} onClick=${ok && !busy ? () => act('play', { card: id }) : null} />`; })}</div>
      ${s.phase === 'bid' && s.status === 'play' && myBid == null ? html`<div class="row" style="justify-content:center;margin-top:10px">${Array.from({ length: s.round + 1 }, (_, n) =>
        html`<button key=${n} class="btn" disabled=${busy} onClick=${() => patch({ bids: { [myId]: n } })}>${n}번</button>`)}</div>` : null}
    </div>
    <${LogList} log=${s.log} nameOf=${nameOf} />
    ${s.status !== 'play' ? html`<${Overlay}><h2>${s.status === 'gameEnd' ? `🏆 ${nameOf(s.players.slice().sort((a, b) => s.scores[b.id] - s.scores[a.id])[0].id)} 우승!` : `${s.round}라운드 결과`}</h2>
      <table class="result"><thead><tr><th>이름</th><th>장담</th><th>이긴 판</th><th>이번</th><th>누적</th></tr></thead><tbody>
        ${s.players.slice().sort((a, b) => s.scores[b.id] - s.scores[a.id]).map(p => html`<tr key=${p.id}><td>${p.nick}</td><td>${s.bids[p.id]}</td><td>${s.won[p.id]}</td><td>${s.result.add[p.id] > 0 ? '+' : ''}${s.result.add[p.id]}</td><td class="score">${s.scores[p.id]}</td></tr>`)}</tbody></table>
      ${isHost ? (s.status === 'gameEnd' ? html`<div class="row"><button class="btn primary" style="flex:1" disabled=${busy} onClick=${restart}>새 게임</button><button class="btn" onClick=${close}>방 닫기</button></div>`
        : html`<button class="btn primary" disabled=${busy} onClick=${() => act('next')}>다음 라운드</button>`) : html`<p class="small muted">방장이 다음을 시작하기를 기다려요</p>`}<//>` : null}
  </div>`;
}
function Icon() { return html`<div class="row" style="gap:2px"><${BCard} id="1-13" size="sm" /><${BCard} id="0-1" size="sm" /><${BCard} id="2-7" size="sm" /></div>`; }
GAMES.push({ id: 'bet', name: '도깨비 장담', who: '2~6명 · 20분', min: 2, max: 6, blurb: '이번 라운드에 몇 번 이길지 장담하고 딱 맞혀야 점수를 얻는 눈치 카드게임',
  start: BET.start, act: BET.act, Board, Rules, Icon });
})();
