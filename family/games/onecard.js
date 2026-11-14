'use strict';
/* 게임: 원카드 (한국 전래 카드놀이 규칙) */
const ONE = (() => {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const BANKRUPT = 20;
  const deck = () => ['S', 'H', 'D', 'C'].flatMap(s => RANKS.map(r => s + r)).concat(['JK0', 'JK1']);
  const suit = id => id.startsWith('JK') ? null : id[0];
  const rank = id => id.startsWith('JK') ? 'JK' : id.slice(1);
  const attackOf = id => id === 'JK1' ? 7 : id === 'JK0' ? 5 : id === 'SA' ? 5 : rank(id) === 'A' ? 3 : rank(id) === '2' ? 2 : 0;
  const top = s => s.discard[s.discard.length - 1];
  const active = s => s.players.filter(p => !s.out.includes(p.id)).map(p => p.id);
  const cur = s => s.players[s.turn].id;

  function start(s0) {
    const s = clone(s0); const n = s.players.length;
    s.deck = shuffle(deck()); s.hands = {}; s.out = []; s.discard = [];
    s.players.forEach(p => { s.hands[p.id] = s.deck.splice(-(n <= 4 ? 7 : 5)); });
    s.discard.push(s.deck.pop());
    s.turn = Math.floor(Math.random() * n); s.dir = 1; s.attack = 0; s.suit = null; s.status = 'play'; s.winner = null; s.log = [];
    pushLog(s, null, '게임 시작! 버림더미와 같은 무늬나 숫자를 내세요');
    return s;
  }
  function drawN(s, pid, n) {
    let got = 0;
    for (let i = 0; i < n; i++) {
      if (!s.deck.length) { const t = s.discard.pop(); s.deck = shuffle(s.discard); s.discard = [t]; }
      const c = s.deck.pop(); if (!c) break; s.hands[pid].push(c); got++;
    }
    return got;
  }
  function next(s, steps = 1) {
    const n = s.players.length; let i = s.turn;
    for (let k = 0; k < steps; k++) { do { i = (i + s.dir + n) % n; } while (s.out.includes(s.players[i].id)); }
    s.turn = i;
  }
  function canPlay(s, id) {
    const t = top(s), eff = s.suit || suit(t);
    if (s.attack > 0) {
      if (id.startsWith('JK')) return true;
      if (attackOf(id) && (rank(id) === rank(t) || suit(id) === eff)) return true;
      if (rank(id) === '3' && !t.startsWith('JK') && suit(id) === eff) return true;  // 3으로 막기
      return false;
    }
    if (id.startsWith('JK') || t.startsWith('JK')) return true;
    return suit(id) === eff || rank(id) === rank(t);
  }
  function checkBankrupt(s, pid) {
    if (s.hands[pid].length < BANKRUPT) return false;
    s.out.push(pid); s.deck = shuffle(s.deck.concat(s.hands[pid])); s.hands[pid] = [];
    pushLog(s, pid, `카드가 ${BANKRUPT}장이 넘어 파산!`);
    const left = active(s); if (left.length === 1) { s.winner = left[0]; s.status = 'end'; pushLog(s, left[0], '혼자 남아 승리!'); }
    return true;
  }
  function act(st, pid, type, a = {}) {
    const s = clone(st);
    if (s.status !== 'play') throw Error('게임이 끝났어요');
    if (cur(s) !== pid) throw Error('내 차례가 아니에요');
    const hand = s.hands[pid];
    if (type === 'play') {
      const id = a.card; if (!hand.includes(id)) throw Error('그 카드가 없어요');
      if (!canPlay(s, id)) throw Error(s.attack ? '공격 카드나 같은 무늬 3만 낼 수 있어요' : '같은 무늬나 숫자만 낼 수 있어요');
      if (rank(id) === '7' && !SUITS[a.suit]) throw Error('바꿀 무늬를 고르세요');
      hand.splice(hand.indexOf(id), 1); s.discard.push(id);
      const r = rank(id); let steps = 1, msg = `${label(id)}를 냈어요`;
      if (attackOf(id)) { s.attack += attackOf(id); msg += ` — 공격 ${s.attack}장!`; }
      else if (r === '3' && s.attack) { s.attack = 0; msg += ' — 공격을 막았어요'; }
      s.suit = r === '7' ? a.suit : null; if (r === '7') msg += ` — 무늬를 ${SUITS[a.suit]}로`;
      if (r === 'J') { steps = 2; msg += ' — 다음 사람 건너뛰기'; }
      if (r === 'Q') { s.dir *= -1; msg += ' — 방향 바꾸기'; }
      if (r === 'K') { steps = 0; msg += ' — 한 번 더!'; }
      if (hand.length === 0) { s.winner = pid; s.status = 'end'; pushLog(s, pid, msg); pushLog(s, pid, '카드를 다 털어 승리!'); return s; }
      if (hand.length === 1) {
        if (a.oneCall) msg += ' · 원카드!';
        else { drawN(s, pid, 1); msg += ' · 원카드를 안 외쳐서 벌칙 1장'; }
      }
      pushLog(s, pid, msg);
      if (steps) next(s, steps);
      return s;
    }
    if (type === 'draw') {
      const n = s.attack || 1; const got = drawN(s, pid, n);
      pushLog(s, pid, s.attack ? `공격을 받아 ${got}장 가져갔어요` : '1장 가져갔어요');
      s.attack = 0;
      if (!checkBankrupt(s, pid) || s.status === 'play') next(s, 1);
      return s;
    }
    throw Error('알 수 없는 행동');
  }
  const label = id => id === 'JK1' ? '컬러 조커' : id === 'JK0' ? '흑백 조커' : SUITS[suit(id)] + rank(id);
  return { start, act, canPlay, top, cur, suit, rank, attackOf, label, active, BANKRUPT };
})();

(() => {
function Rules({ onClose }) {
  return html`<${Overlay} onClose=${onClose}><div class="rules">
    <h2>원카드 규칙</h2>
    <p><b>목표:</b> 손에 든 카드를 가장 먼저 다 내면 이겨요. 카드가 ${ONE.BANKRUPT}장 이상이 되면 파산해서 탈락해요.</p>
    <h3>기본</h3>
    <ul><li>버림더미 맨 위 카드와 <b>같은 무늬</b>나 <b>같은 숫자</b>를 1장 내요.</li>
      <li>낼 카드가 없거나 내기 싫으면 덱에서 1장 가져와요.</li>
      <li>카드가 2장일 때 <b>원카드!</b> 버튼을 켜고 내야 해요. 안 켜고 1장이 되면 벌칙으로 1장을 받아요.</li></ul>
    <h3>특수 카드</h3>
    <ul><li><b>공격:</b> A는 3장, ♠A는 5장, 2는 2장, 흑백 조커는 5장, 컬러 조커는 7장을 다음 사람에게 먹여요. 공격은 계속 쌓여요.</li>
      <li><b>방어:</b> 공격을 받으면 같은 숫자나 같은 무늬의 공격 카드(A·2), 또는 조커를 내서 넘길 수 있어요. 같은 무늬 <b>3</b>을 내면 공격을 막아요. 못 막으면 쌓인 만큼 가져가요.</li>
      <li><b>7:</b> 무늬를 원하는 것으로 바꿔요.</li><li><b>J:</b> 다음 사람을 건너뛰어요.</li>
      <li><b>Q:</b> 도는 방향을 바꿔요.</li><li><b>K:</b> 한 장 더 내요.</li>
      <li><b>조커:</b> 언제든 낼 수 있고, 조커 다음에는 아무 카드나 낼 수 있어요.</li></ul>
    <div class="row" style="margin-top:12px"><button class="btn primary" style="flex:1" onClick=${onClose}>알겠어요</button></div></div><//>`;
}

function Board({ room: s, me, busy, act, nameOf, isHost, close, restart }) {
  const myId = me.id, hand = (s.hands[myId] || []).slice().sort(sortCards);
  const myTurn = s.status === 'play' && ONE.cur(s) === myId;
  const [oneCall, setOneCall] = useState(false);
  const [pick7, setPick7] = useState(null);
  useEffect(() => { setOneCall(false); setPick7(null); }, [s.ver]);
  const t = ONE.top(s);
  const play = id => { if (ONE.rank(id) === '7') return setPick7(id); act('play', { card: id, oneCall }); };
  const playable = id => myTurn && ONE.canPlay(s, id);
  const anyPlayable = myTurn && hand.some(id => ONE.canPlay(s, id));
  return html`<div class="stack">
    <div class="opps">${s.players.filter(p => p.id !== myId).map(p => html`<div key=${p.id} class=${'opp' + (s.status === 'play' && ONE.cur(s) === p.id ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><span class="name"><span>${p.nick}</span></span>
        <span class="small">${s.out.includes(p.id) ? '파산' : `${s.hands[p.id].length}장`}${s.hands[p.id].length === 1 ? html` <span class="chip">원카드</span>` : null}</span></div>
      <div class="cards-row" style="gap:2px">${s.hands[p.id].slice(0, 14).map((c, i) => html`<${PCard} key=${i} back size="sm" />`)}</div></div>`)}</div>
    <div class="table">
      <div class="pile"><button type="button" class="pc-btn" disabled=${!myTurn || busy} onClick=${() => act('draw')} aria-label="덱에서 가져오기"><${PCard} back size="lg" can=${myTurn} /></button>
        <span class="cap">덱 ${s.deck.length}장</span></div>
      <div class="pile"><${PCard} id=${t} size="lg" /><span class="cap">${s.suit ? `무늬: ${SUITS[s.suit]}` : '버림더미'}</span></div>
      <div class="pile" style="text-align:center"><span class="display" style="font-size:22px">${s.dir === 1 ? '↻' : '↺'}</span>
        ${s.attack ? html`<span class="chip" style="border-color:var(--plum);color:#ffc2d1">공격 ${s.attack}장</span>` : html`<span class="cap">방향</span>`}</div>
    </div>
    <div class="status" role="status">${s.status === 'end' ? `${nameOf(s.winner)} 승리!` : myTurn ? (s.attack ? `공격 ${s.attack}장! 막거나 가져가세요` : anyPlayable ? '낼 카드를 누르세요' : '낼 카드가 없어요. 덱에서 가져오세요') : `${nameOf(ONE.cur(s))}의 차례`}</div>
    <div class=${'me' + (myTurn ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><b>${nameOf(myId)} (나) · ${hand.length}장</b>
        ${myTurn && hand.length === 2 ? html`<button class=${'btn sm ' + (oneCall ? 'primary' : '')} onClick=${() => setOneCall(v => !v)}>${oneCall ? '원카드! ✓' : '원카드! 외치기'}</button>` : null}</div>
      <div class="fan">${hand.map(id => html`<${PCard} key=${id} id=${id} can=${playable(id)} dim=${myTurn && !playable(id)} onClick=${playable(id) && !busy ? () => play(id) : null} />`)}</div>
      ${myTurn ? html`<div class="actions"><button class="btn wide" disabled=${busy} onClick=${() => act('draw')}>${s.attack ? `${s.attack}장 가져가기` : '덱에서 1장 가져오기'}</button></div>` : null}
    </div>
    <${LogList} log=${s.log} nameOf=${nameOf} />
    ${pick7 ? html`<${Overlay} onClose=${() => setPick7(null)}><h2>무늬를 고르세요</h2>
      <div class="grid2">${Object.entries(SUITS).map(([k, v]) => html`<button key=${k} class="btn" style=${'font-size:28px;' + (k === 'H' || k === 'D' ? 'color:#ff8fa3' : '')} onClick=${() => act('play', { card: pick7, suit: k, oneCall })}>${v}</button>`)}</div><//>` : null}
    ${s.status === 'end' ? html`<${Overlay}><h2>🏆 ${nameOf(s.winner)} 승리!</h2>
      <table class="result"><tbody>${s.players.map(p => html`<tr key=${p.id}><td>${p.nick}</td><td>${p.id === s.winner ? '승리' : s.out.includes(p.id) ? '파산' : `${s.hands[p.id].length}장 남음`}</td></tr>`)}</tbody></table>
      ${isHost ? html`<div class="row"><button class="btn primary" style="flex:1" disabled=${busy} onClick=${restart}>한 판 더</button><button class="btn" onClick=${close}>방 닫기</button></div>` : html`<p class="small muted">방장이 다음 판을 시작하기를 기다려요</p>`}<//>` : null}
  </div>`;
}
const ORDER = 'SHDC', RORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function sortCards(a, b) { if (a.startsWith('JK') || b.startsWith('JK')) return a.startsWith('JK') - b.startsWith('JK');
  return ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]) || RORDER.indexOf(a.slice(1)) - RORDER.indexOf(b.slice(1)); }
function Icon() { return html`<div class="row" style="gap:2px"><${PCard} id="HA" size="sm" /><${PCard} id="S7" size="sm" /><${PCard} id="JK1" size="sm" /></div>`; }
GAMES.push({ id: 'onecard', name: '원카드', who: '2~6명 · 10분', min: 2, max: 6, blurb: '같은 무늬나 숫자를 내며 공격하고 막는, 우리가 아는 그 원카드',
  start: ONE.start, act: ONE.act, Board, Rules, Icon });
})();
