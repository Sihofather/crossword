'use strict';
/* 게임: 도깨비 왕 (전래 '대통령' 방식 계급 카드게임, 오리지널 규칙) */
const RANK = (() => {
  const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const ROUNDS = 5;
  const val = id => id.startsWith('JK') ? 99 : RANKS.indexOf(id.slice(1)) + 3;   // 3=3 … 2=15, 조커는 만능
  const deck = () => ['S', 'H', 'D', 'C'].flatMap(s => RANKS.map(r => s + r)).concat(['JK0', 'JK1']);
  const cur = s => s.players[s.turn].id;
  const live = s => s.players.map(p => p.id).filter(id => !s.finished.includes(id));
  const titleOf = (n, i) => i === 0 ? '도깨비 왕' : i === n - 1 ? '노예 도깨비' : (i === 1 && n >= 4 ? '도깨비 장수' : '도깨비');

  // 같은 숫자 묶음 판정: 조커는 아무 숫자로 쓸 수 있음. 조커만 내면 가장 강함(16)
  function setInfo(cards) {
    if (!cards.length || cards.length > 6) return null;
    const plain = cards.filter(c => !c.startsWith('JK'));
    if (!plain.length) return { rank: 16, count: cards.length };
    const v = val(plain[0]); if (plain.some(c => val(c) !== v)) return null;
    return { rank: v, count: cards.length };
  }
  function deal(s) {
    const d = shuffle(deck()), n = s.players.length; s.hands = {};
    s.players.forEach(p => s.hands[p.id] = []);
    d.forEach((c, i) => s.hands[s.players[i % n].id].push(c));
  }
  function start(s0) {
    const s = clone(s0);
    s.round = 0; s.scores = Object.fromEntries(s.players.map(p => [p.id, 0])); s.titles = {}; s.log = [];
    return newRound(s);
  }
  function newRound(s0) {
    const s = clone(s0); s.round++; deal(s);
    s.finished = []; s.pile = null; s.passed = []; s.status = 'play'; s.exchange = null;
    const n = s.players.length, order = s.lastOrder;
    if (order && order.length === n) {
      // 노예 도깨비 → 도깨비 왕: 가장 좋은 카드, 도깨비 왕 → 노예 도깨비: 가장 나쁜 카드 (3명이면 1장, 4명 이상이면 2장)
      const k = n >= 4 ? 2 : 1, top = order[0], low = order[n - 1];
      const byVal = id => s.hands[id].slice().sort((a, b) => val(a) - val(b));
      const give = byVal(low).slice(-k), back = byVal(top).slice(0, k);
      s.hands[low] = s.hands[low].filter(c => !give.includes(c)).concat(back);
      s.hands[top] = s.hands[top].filter(c => !back.includes(c)).concat(give);
      s.exchange = { top, low, give, back };
      pushLog(s, low, `노예 도깨비라 가장 좋은 카드 ${k}장을 도깨비 왕 {${top}}에게 바쳤어요`);
      s.turn = s.players.findIndex(p => p.id === low);
    } else {
      s.turn = s.players.findIndex(p => s.hands[p.id].includes('C3'));
    }
    pushLog(s, null, `${s.round}번째 판 시작! ${s.round === 1 ? '♣3을 가진 사람부터' : '노예 도깨비부터'} 내요`);
    return s;
  }
  function advance(s) {
    const n = s.players.length; let i = s.turn;
    do { i = (i + 1) % n; } while (s.finished.includes(s.players[i].id));
    s.turn = i;
  }
  function clearIfAllPassed(s) {
    if (!s.pile) return;
    const others = live(s).filter(id => id !== s.pile.pid);
    if (others.every(id => s.passed.includes(id))) {
      const owner = s.pile.pid; s.pile = null; s.passed = [];
      if (!s.finished.includes(owner)) s.turn = s.players.findIndex(p => p.id === owner);
      else { s.turn = s.players.findIndex(p => p.id === owner); advance(s); }
      pushLog(s, null, '모두 넘겨서 판을 치웠어요. 새로 낼 차례');
      return true;
    }
    return false;
  }
  function endRound(s) {
    const n = s.players.length;
    const rest = live(s); s.finished = s.finished.concat(rest);
    s.lastOrder = s.finished.slice(); s.titles = {};
    s.lastOrder.forEach((id, i) => { s.titles[id] = titleOf(n, i); s.scores[id] += n - 1 - i; });
    s.status = s.round >= ROUNDS ? 'gameEnd' : 'roundEnd';
    pushLog(s, s.lastOrder[0], '도깨비 왕이 되었어요!');
  }
  function act(st, pid, type, a = {}) {
    const s = clone(st);
    if (s.status !== 'play') throw Error('지금은 낼 수 없어요');
    if (cur(s) !== pid) throw Error('내 차례가 아니에요');
    if (type === 'play') {
      const cards = a.cards || [], hand = s.hands[pid];
      if (!cards.length || cards.some(c => !hand.includes(c)) || new Set(cards).size !== cards.length) throw Error('낼 카드를 고르세요');
      const info = setInfo(cards); if (!info) throw Error('같은 숫자끼리만 함께 낼 수 있어요 (조커는 아무 숫자)');
      if (s.pile) {
        if (info.count !== s.pile.count) throw Error(`${s.pile.count}장을 같이 내야 해요`);
        if (info.rank <= s.pile.rank) throw Error('앞 사람보다 높은 숫자를 내야 해요');
      }
      s.hands[pid] = hand.filter(c => !cards.includes(c));
      s.pile = { pid, cards, rank: info.rank, count: info.count }; s.passed = [];
      pushLog(s, pid, `${cards.length}장을 냈어요`);
      if (!s.hands[pid].length) { s.finished.push(pid); pushLog(s, pid, `${s.finished.length}등으로 다 털었어요!`); }
      if (live(s).length <= 1) { endRound(s); return s; }
      advance(s); clearIfAllPassed(s); return s;
    }
    if (type === 'pass') {
      if (!s.pile) throw Error('새로 낼 차례라 넘길 수 없어요');
      s.passed.push(pid); pushLog(s, pid, '넘겼어요');
      if (!clearIfAllPassed(s)) advance(s);
      return s;
    }
    if (type === 'next') return newRound(s);
    throw Error('알 수 없는 행동');
  }
  return { start, newRound, act, setInfo, val, cur, ROUNDS, titleOf };
})();

(() => {
function Rules({ onClose }) {
  return html`<${Overlay} onClose=${onClose}><div class="rules">
    <h2>도깨비 왕 규칙</h2>
    <p><b>목표:</b> 손에 든 카드를 남보다 빨리 털어요. 빨리 턴 순서대로 도깨비 왕 · 도깨비 장수 · 도깨비 · 노예 도깨비가 돼요. ${RANK.ROUNDS}판을 해서 점수가 가장 높은 사람이 이겨요. 3~6명이 함께 해요.</p>
    <h3>카드의 세기</h3><div class="row" style="gap:4px;flex-wrap:wrap">${['S3', 'S10', 'SJ', 'SQ', 'SK', 'SA', 'S2', 'JK1'].map(id => html`<${PCard} key=${id} id=${id} size="md" hint=${id === 'JK1' ? '만능' : null} />`)}</div><p>3이 가장 약하고 4, 5 … 10, J, Q, K, A, 그리고 <b>2가 가장 셉니다</b>. 조커는 아무 숫자로 쓸 수 있고, 조커만 내면 무엇보다 세요.</p>
    <h3>진행</h3><ul><li>첫 판은 ♣3을 가진 사람부터 시작해요. 같은 숫자 카드를 1~4장(조커 포함) 함께 내요.</li>
      <li>다음 사람은 <b>같은 장수</b>로 <b>더 높은 숫자</b>를 내거나 넘겨요. 넘긴 사람도 돌아오면 다시 낼 수 있어요.</li>
      <li>모두 넘기면 판을 치우고, 마지막에 낸 사람이 새로 아무 묶음이나 내요.</li></ul>
    <h3>신분 바꾸기</h3><ul><li>다음 판이 시작되면 <b>노예 도깨비는 가장 좋은 카드</b>를 도깨비 왕에게 바치고, <b>도깨비 왕은 가장 나쁜 카드</b>를 노예 도깨비에게 돌려줘요 (4명 이상이면 2장, 3명이면 1장). 자동으로 처리돼요.</li>
      <li>노예 도깨비가 다음 판을 시작해요.</li></ul>
    <h3>점수</h3><p>판마다 1등은 (인원−1)점, 꼴찌는 0점을 받아요.</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" style="flex:1" onClick=${onClose}>알겠어요</button></div></div><//>`;
}
function Board({ room: s, me, busy, act, nameOf, isHost, close, restart }) {
  const myId = me.id, hand = (s.hands[myId] || []).slice().sort((a, b) => RANK.val(a) - RANK.val(b));
  const myTurn = s.status === 'play' && RANK.cur(s) === myId;
  const [sel, setSel] = useState([]);
  useEffect(() => setSel([]), [s.ver]);
  const info = RANK.setInfo(sel);
  const ok = info && (!s.pile || (info.count === s.pile.count && info.rank > s.pile.rank));
  const toggle = id => setSel(x => x.includes(id) ? x.filter(y => y !== id) : x.concat(id));
  const title = id => s.titles?.[id] ? html`<span class="chip">${s.titles[id]}</span>` : null;
  return html`<div class="stack">
    <div class="opps">${s.players.filter(p => p.id !== myId).map(p => html`<div key=${p.id} class=${'opp' + (s.status === 'play' && RANK.cur(s) === p.id ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><span class="name"><span>${p.nick}</span>${title(p.id)}</span>
        <span class="small">${s.finished.includes(p.id) ? `${s.finished.indexOf(p.id) + 1}등 완료` : `${s.hands[p.id].length}장`}${s.passed.includes(p.id) ? ' · 넘김' : ''} · <span class="score">${s.scores[p.id]}</span>점</span></div></div>`)}</div>
    <div class="table" style="min-height:120px">
      ${s.pile ? html`<div class="pile"><div class="row" style="gap:4px">${s.pile.cards.map(c => html`<${PCard} key=${c} id=${c} size="lg" />`)}</div>
        <span class="cap">${josa(nameOf(s.pile.pid), '이', '가')} 낸 ${s.pile.count}장 — 이보다 높은 ${s.pile.count}장을 내야 해요</span></div>`
        : html`<span class="muted">판이 비었어요. ${s.status === 'play' ? `${josa(nameOf(RANK.cur(s)), '이', '가')} 새로 내요` : ''}</span>`}
    </div>
    <div class="status" role="status">${s.status !== 'play' ? `${s.round}번째 판 끝` : myTurn ? (s.pile ? '같은 장수로 더 높게 내거나 넘기세요' : '아무 묶음이나 새로 내세요') : `${nameOf(RANK.cur(s))}의 차례`}
      <span class="small muted"> · ${s.round}/${RANK.ROUNDS}판</span></div>
    <div class=${'me' + (myTurn ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><b>${nameOf(myId)} (나) ${s.titles?.[myId] ? `· ${s.titles[myId]}` : ''}</b><span class="small">${hand.length}장 · <span class="score">${s.scores[myId]}</span>점</span></div>
      <div class="fan">${hand.map(id => html`<${PCard} key=${id} id=${id} size="md" hint=${id.startsWith('JK') ? '만능' : null} sel=${sel.includes(id)} onClick=${myTurn && !busy ? () => toggle(id) : null} />`)}</div>
      ${s.exchange && s.round > 1 && (s.exchange.top === myId || s.exchange.low === myId) && s.status === 'play' ? html`<p class="small muted" style="text-align:center">
        ${s.exchange.low === myId ? `노예 도깨비라 ${s.exchange.give.length}장을 바치고 ${s.exchange.back.length}장을 돌려받았어요` : `노예 도깨비에게 좋은 카드 ${s.exchange.give.length}장을 받고 나쁜 카드를 돌려줬어요`}</p>` : null}
      ${myTurn ? html`<div class="actions">
        <button class="btn" disabled=${busy || !s.pile} onClick=${() => act('pass')}>넘기기</button>
        <button class="btn primary" disabled=${busy || !ok} onClick=${() => act('play', { cards: sel })}>${sel.length ? `${sel.length}장 내기` : '카드를 고르세요'}</button></div>` : null}
    </div>
    <${LogList} log=${s.log} nameOf=${nameOf} />
    ${s.status !== 'play' ? html`<${Overlay}><h2>${s.status === 'gameEnd' ? `🏆 ${nameOf(s.players.slice().sort((a, b) => s.scores[b.id] - s.scores[a.id])[0].id)} 우승!` : `${s.round}번째 판 결과`}</h2>
      <table class="result"><thead><tr><th>순서</th><th>이름</th><th>신분</th><th>누적</th></tr></thead><tbody>
        ${s.lastOrder.map((id, i) => html`<tr key=${id}><td>${i + 1}</td><td>${nameOf(id)}</td><td>${s.titles[id]}</td><td class="score">${s.scores[id]}</td></tr>`)}</tbody></table>
      ${isHost ? (s.status === 'gameEnd' ? html`<div class="row"><button class="btn primary" style="flex:1" disabled=${busy} onClick=${restart}>새 게임</button><button class="btn" onClick=${close}>방 닫기</button></div>`
        : html`<button class="btn primary" disabled=${busy} onClick=${() => act('next')}>다음 판 (신분 카드 교환)</button>`) : html`<p class="small muted">방장이 다음 판을 시작하기를 기다려요</p>`}<//>` : null}
  </div>`;
}
function Icon() { return html`<div class="row" style="gap:2px"><${PCard} id="S2" size="sm" /><${PCard} id="H2" size="sm" /><${PCard} id="JK0" size="sm" /></div>`; }
GAMES.push({ id: 'rank', name: '도깨비 왕', who: '3~6명 · 20분', min: 3, max: 6, blurb: '같은 숫자 묶음을 더 높게 내며 패를 털고, 판마다 신분이 뒤바뀌는 계급 카드게임',
  start: RANK.start, act: (s, pid, type, a) => type === 'next' ? (s.status === 'roundEnd' ? RANK.newRound(s) : (() => { throw Error('아직 판이 안 끝났어요'); })()) : RANK.act(s, pid, type, a), Board, Rules, Icon });
})();
