'use strict';
/* 게임: 도깨비 셈 (오리지널) */
/* =====================================================================
   도깨비 셈 — 규칙 엔진 (순수 함수: 상태 → 새 상태)
   ===================================================================== */
const DOK = (() => {
  const KINDS = {
    n:     { label: '' },
    gold:  { v: -3, name: '금방망이', label: '금방망이', desc: '가장 좋은 카드 (−3점)' },
    lamp:  { v: 5,  name: '등불',     label: '등불',     desc: '버리면: 내 카드 1장 몰래 보기', ability: 'peekSelf' },
    eye:   { v: 6,  name: '도깨비 눈', label: '도깨비 눈', desc: '버리면: 다른 사람 카드 1장 몰래 보기', ability: 'peekOther' },
    swap:  { v: 8,  name: '바꿔치기', label: '바꿔치기', desc: '버리면: 내 카드 1장과 다른 사람 카드 1장을 안 보고 맞바꾸기', ability: 'swap' },
    boss:  { v: 12, name: '대장 도깨비', label: '대장', desc: '가장 나쁜 카드 (12점)' },
  };
  const HAND = 4, MAX_HAND = 6, GOAL = 50, CALL_PENALTY = 10;

  function makeCards() {
    const cards = {}; let i = 0;
    const add = (k, v) => { cards['c' + (i++)] = { k, v }; };
    for (let c = 0; c < 4; c++) add('n', 0);
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 5; c++) add('n', v);
    ['gold', 'gold', 'lamp', 'lamp', 'lamp', 'eye', 'eye', 'eye', 'swap', 'swap', 'swap', 'boss', 'boss'].forEach(k => add(k, KINDS[k].v));
    return cards;
  }
  const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clone = s => JSON.parse(JSON.stringify(s));
  const idxOf = (s, pid) => s.players.findIndex(p => p.id === pid);
  const cur = s => s.players[s.turn].id;
  const handSum = (s, pid) => (s.hands[pid] || []).reduce((t, c) => t + s.cards[c].v, 0);
  const log = (s, who, text) => { s.log = [{ who, text, at: s.ver }].concat(s.log || []).slice(0, 8); };

  function drawFromDeck(s) {
    if (!s.deck.length) {
      const top = s.discard.pop();
      s.deck = shuffle(s.discard); s.discard = top ? [top] : [];
      if (s.deck.length) log(s, null, '덱이 떨어져 버림더미를 섞었어요');
    }
    return s.deck.pop() || null;
  }

  function newRound(s, rnd) {
    s = clone(s);
    s.cards = s.cards || makeCards();
    s.deck = shuffle(Object.keys(s.cards), rnd); s.discard = []; s.hands = {};
    s.players.forEach(p => { s.hands[p.id] = s.deck.splice(-HAND); });
    s.discard.push(s.deck.pop());
    s.round = (s.round || 0) + 1;
    s.turn = (s.round - 1) % s.players.length;
    s.caller = null; s.pending = null; s.ability = null; s.reveal = null; s.result = null; s.turnsPlayed = 0;
    s.status = 'play';
    s.scores = s.scores || Object.fromEntries(s.players.map(p => [p.id, 0]));
    log(s, null, `${s.round}라운드 시작! 처음 받은 카드 중 왼쪽 2장을 확인하세요`);
    return s;
  }

  function endTurn(s) {
    s.pending = null; s.ability = null; s.turnsPlayed++;
    s.turn = (s.turn + 1) % s.players.length;
    if (s.caller && cur(s) === s.caller) return scoreRound(s);
    return s;
  }

  function scoreRound(s) {
    const sums = Object.fromEntries(s.players.map(p => [p.id, handSum(s, p.id)]));
    const min = Math.min(...Object.values(sums));
    const add = {};
    s.players.forEach(p => {
      if (p.id === s.caller) add[p.id] = sums[p.id] <= min ? 0 : sums[p.id] + CALL_PENALTY;
      else add[p.id] = sums[p.id];
    });
    s.players.forEach(p => { s.scores[p.id] += add[p.id]; });
    const over = Object.values(s.scores).some(v => v >= GOAL);
    s.result = { sums, add, callerWon: s.caller ? sums[s.caller] <= min : null, over };
    s.status = over ? 'gameEnd' : 'roundEnd';
    log(s, null, over ? '게임 끝!' : `${s.round}라운드 끝`);
    return s;
  }

  // 모든 행동: (상태, 행동자, 인자) → 새 상태. 규칙 위반이면 Error(한국어 메시지)
  function act(state, pid, type, a = {}) {
    const s = clone(state);
    const mine = () => { if (s.status !== 'play') throw Error('지금은 게임 중이 아니에요'); if (cur(s) !== pid) throw Error('내 차례가 아니에요'); };
    const hand = s.hands[pid];
    switch (type) {
      case 'draw': {
        mine(); if (s.pending || s.ability) throw Error('이미 카드를 가지고 있어요');
        const c = drawFromDeck(s); if (!c) return scoreRound(s);
        s.pending = { card: c, from: 'deck' }; log(s, pid, '덱에서 카드를 뽑았어요'); return s;
      }
      case 'takeDiscard': {
        mine(); if (s.pending || s.ability) throw Error('이미 카드를 가지고 있어요');
        if (!s.discard.length) throw Error('버림더미가 비어 있어요');
        if (!hand.length) throw Error('카드가 없으면 버림더미를 가져올 수 없어요. 덱에서 뽑으세요');
        s.pending = { card: s.discard.pop(), from: 'discard' }; log(s, pid, '버림더미 카드를 가져왔어요'); return s;
      }
      case 'swapPending': {
        mine(); if (!s.pending) throw Error('먼저 카드를 가져오세요');
        const i = a.idx; if (!(i >= 0 && i < hand.length)) throw Error('바꿀 카드를 고르세요');
        const old = hand[i]; hand[i] = s.pending.card; s.discard.push(old);
        log(s, pid, `${i + 1}번 카드를 바꾸고 ${cardName(s.cards[old])}${eul(s.cards[old])} 버렸어요`);
        return endTurn(s);
      }
      case 'discardPending': {
        mine(); if (!s.pending) throw Error('먼저 카드를 가져오세요');
        if (s.pending.from === 'discard') throw Error('버림더미에서 가져온 카드는 바꿔야 해요');
        const c = s.pending.card, kind = KINDS[s.cards[c].k]; s.discard.push(c); s.pending = null;
        if (a.useAbility && kind.ability) {
          if (kind.ability !== 'peekSelf' && s.players.length < 2) throw Error('상대가 없어요');
          s.ability = { type: kind.ability }; log(s, pid, `${kind.name} 능력을 써요`); return s;
        }
        log(s, pid, `${cardName(s.cards[c])}${eul(s.cards[c])} 버렸어요`); return endTurn(s);
      }
      case 'peekSelf': {
        mine(); if (!s.ability || s.ability.type !== 'peekSelf') throw Error('등불 능력이 없어요');
        if (!(a.idx >= 0 && a.idx < hand.length)) throw Error('볼 카드를 고르세요');
        log(s, pid, `자기 ${a.idx + 1}번 카드를 몰래 봤어요`); return endTurn(s);
      }
      case 'peekOther': {
        mine(); if (!s.ability || s.ability.type !== 'peekOther') throw Error('도깨비 눈 능력이 없어요');
        const th = s.hands[a.target]; if (!th || a.target === pid || !(a.idx >= 0 && a.idx < th.length)) throw Error('다른 사람 카드를 고르세요');
        log(s, pid, `{${a.target}}의 ${a.idx + 1}번 카드를 몰래 봤어요`); return endTurn(s);
      }
      case 'swapCards': {
        mine(); if (!s.ability || s.ability.type !== 'swap') throw Error('바꿔치기 능력이 없어요');
        const th = s.hands[a.target]; if (!th || a.target === pid) throw Error('다른 사람 카드를 고르세요');
        if (!(a.myIdx >= 0 && a.myIdx < hand.length && a.idx >= 0 && a.idx < th.length)) throw Error('바꿀 카드 두 장을 고르세요');
        [hand[a.myIdx], th[a.idx]] = [th[a.idx], hand[a.myIdx]];
        log(s, pid, `자기 ${a.myIdx + 1}번 카드와 {${a.target}}의 ${a.idx + 1}번 카드를 맞바꿨어요`); return endTurn(s);
      }
      case 'skipAbility': {
        mine(); if (!s.ability) throw Error('쓸 능력이 없어요');
        log(s, pid, '능력을 쓰지 않았어요'); return endTurn(s);
      }
      case 'pair': {
        mine(); if (s.pending || s.ability) throw Error('지금은 짝 버리기를 할 수 없어요');
        const [i, j] = a.idx || []; if (i === j || !(i >= 0 && i < hand.length && j >= 0 && j < hand.length)) throw Error('내 카드 두 장을 고르세요');
        const ci = hand[i], cj = hand[j], vi = s.cards[ci].v, vj = s.cards[cj].v;
        s.reveal = { pid, cards: [ci, cj], ok: vi === vj, at: s.ver + 1 };
        if (vi === vj) {
          [i, j].sort((x, y) => y - x).forEach(k => hand.splice(k, 1)); s.discard.push(ci, cj);
          log(s, pid, `짝 버리기 성공! ${vi}점 두 장을 버렸어요`);
        } else {
          const pen = hand.length < MAX_HAND ? drawFromDeck(s) : null; if (pen) hand.push(pen);
          log(s, pid, `짝 버리기 실패 (${vi}, ${vj})${pen ? ' — 벌칙 카드 1장' : ''}`);
        }
        return endTurn(s);
      }
      case 'call': {
        mine(); if (s.pending || s.ability) throw Error('지금은 셈을 외칠 수 없어요');
        if (s.caller) throw Error('이미 누군가 셈을 외쳤어요');
        if (s.turnsPlayed < s.players.length) throw Error('한 바퀴 돈 뒤부터 외칠 수 있어요');
        s.caller = pid; log(s, pid, '"셈!"을 외쳤어요. 나머지는 한 번씩만 더!'); return endTurn(s);
      }
      default: throw Error('알 수 없는 행동');
    }
  }
  const cardName = c => c.k === 'n' ? `${c.v}` : `${KINDS[c.k].name}(${c.v})`;
  // 숫자 읽기 끝소리로 을/를 고르기 (0영 1일 3삼 6육 7칠 8팔 → 을)
  const eul = c => [0, 1, 3, 6, 7, 8].includes(Math.abs(c.v) % 10) ? '을' : '를';
  return { KINDS, HAND, GOAL, CALL_PENALTY, makeCards, newRound, act, handSum, cardName, cur, idxOf, shuffle };
})();

(() => {
function DCard({ c, cards, hidden, size, onClick, selectable, selected, flash }) {
  if (!c || hidden) return html`<button type="button" class=${'card back ' + (size || '') + (selectable ? ' selectable' : '') + (selected ? ' selected' : '')}
      onClick=${onClick} disabled=${!onClick} aria-label="뒤집힌 카드"></button>`;
  const d = cards[c], kind = DOK.KINDS[d.k];
  const cls = ['card face', size || '', d.k !== 'n' ? 'special' : '', d.v < 0 ? 'neg' : '', d.v >= 12 ? 'big' : '', selectable ? 'selectable' : '', selected ? 'selected' : '', flash ? 'flash' : ''].join(' ');
  return html`<button type="button" class=${cls} onClick=${onClick} disabled=${!onClick} aria-label=${DOK.cardName(d)}>
    ${d.k !== 'n' && size !== 'sm' ? html`<span class="corner">${d.v}</span>` : null}
    <span class="num">${d.k === 'n' || size === 'sm' ? d.v : kindMark(d.k)}</span>
    ${d.k !== 'n' && size !== 'sm' ? html`<span class="lbl">${kind.label}</span>` : null}
  </button>`;
}
const kindMark = k => ({ gold: '金', lamp: '燈', eye: '眼', swap: '換', boss: '鬼' })[k];

function Rules({ onClose }) {
  const ex = k => html`<${DCard} c="x" cards=${{ x: { k, v: DOK.KINDS[k]?.v ?? 3 } }} size="sm" />`;
  return html`<div class="overlay" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet rules">
    <h2>도깨비 셈 규칙</h2>
    <p><b>목표:</b> 내 앞에 뒤집혀 있는 카드의 숫자 합을 <b>가장 낮게</b> 만드세요. 여러 라운드를 하고, 누군가 누적 ${DOK.GOAL}점이 넘으면 끝! 누적 점수가 가장 낮은 사람이 이겨요.</p>
    <h3>준비</h3>
    <ul><li>각자 카드 ${DOK.HAND}장을 뒤집어 받아요.</li><li>라운드가 시작되면 <b>왼쪽 2장만</b> 잠깐 볼 수 있어요. 잘 기억하세요! 나머지는 모르는 카드예요.</li></ul>
    <h3>내 차례에 할 수 있는 것 (하나만)</h3>
    <ul>
      <li><b>덱에서 뽑기</b> → 뽑은 카드를 내 카드 1장과 바꾸거나, 그냥 버려요. 특수 카드를 버리면 능력을 쓸 수 있어요.</li>
      <li><b>버림더미 가져오기</b> → 맨 위 카드를 가져와 반드시 내 카드 1장과 바꿔요.</li>
      <li><b>짝 버리기</b> → 내 카드 2장을 골라 공개해요. 숫자가 같으면 둘 다 버려서 카드가 줄어요! 다르면 다시 엎고 벌칙으로 카드 1장을 더 받아요.</li>
      <li><b>셈!</b> → "이제 끝!"을 외쳐요 (한 바퀴 돈 뒤부터). 다른 사람들이 한 번씩만 더 하고 라운드가 끝나요.</li>
    </ul>
    <h3>특수 카드 (덱에서 뽑아서 버릴 때만 능력 사용)</h3>
    <div class="legend">
      ${ex('lamp')}<span><b>등불 (5점)</b> 내 카드 1장 몰래 보기</span>
      ${ex('eye')}<span><b>도깨비 눈 (6점)</b> 다른 사람 카드 1장 몰래 보기</span>
      ${ex('swap')}<span><b>바꿔치기 (8점)</b> 내 카드 1장과 다른 사람 카드 1장을 안 보고 맞바꾸기</span>
      ${ex('gold')}<span><b>금방망이 (−3점)</b> 제일 좋은 카드</span>
      ${ex('boss')}<span><b>대장 도깨비 (12점)</b> 제일 나쁜 카드</span>
    </div>
    <p class="small muted">일반 카드: 0~9 (0은 4장, 1~9는 5장씩)</p>
    <h3>점수</h3>
    <ul><li>라운드가 끝나면 모두 공개하고 합계가 내 점수가 돼요.</li>
      <li><b>셈!을 외친 사람</b>이 가장 낮거나 같으면 <b>0점</b>. 아니면 합계 <b>+${DOK.CALL_PENALTY}점</b> 벌칙!</li></ul>
    <h3>팁</h3>
    <ul><li>몰래 본 카드는 3초만 보여요. 기억력 싸움이에요.</li><li>남이 버림더미에서 가져간 카드는 다 같이 봤으니 기억해 두세요.</li></ul>
    <div class="row" style="margin-top:16px"><button class="btn primary" style="flex:1" onClick=${onClose}>알겠어요</button></div>
  </div></div>`;
}

function Board({ room, me, busy, act, commit, nameOf, isHost, say, close }) {
  const s = room, myId = me.id, playing = s.players.some(p => p.id === myId);
  const myTurn = s.status === 'play' && DOK.cur(s) === myId;
  const [sel, setSel] = useState([]);          // 짝 버리기/바꿔치기 선택
  const [mode, setMode] = useState(null);      // 'pair'
  const [peek, setPeek] = useState(null);      // { card, until }
  const [initPeek, setInitPeek] = useState(false);
  const [revealSeen, setRevealSeen] = useState(null);
  const hand = s.hands[myId] || [];

  // 라운드 시작: 왼쪽 2장 보기 (이 폰에서만, 라운드마다 한 번)
  useEffect(() => {
    if (s.status !== 'play' || !playing) return;
    const k = `peek-${s.code}-${s.round}`;
    if (!ls.get(k, false)) setInitPeek(true);
  }, [s.round, s.status]);
  useEffect(() => { setSel([]); setMode(null); }, [s.ver]);
  // 짝 버리기 공개: 모두에게 3초 보여줌
  useEffect(() => { if (s.reveal && s.reveal.at !== revealSeen) { setRevealSeen(s.reveal.at); const r = s.reveal;
    setPeek({ cards: r.cards, title: `${nameOf(r.pid)}의 짝 버리기 ${r.ok ? '성공!' : '실패'}` }); setTimeout(() => setPeek(p => p && p.cards === r.cards ? null : p), 3000); } }, [s.reveal && s.reveal.at]);

  const showPeek = (cards, title) => { setPeek({ cards, title }); setTimeout(() => setPeek(null), 3000); };
  const ab = myTurn ? s.ability : null;
  const pend = myTurn ? s.pending : null;

  const tapMine = i => {
    if (!myTurn || busy) return;
    if (pend) return act('swapPending', { idx: i });
    if (ab?.type === 'peekSelf') { showPeek([hand[i]], `내 ${i + 1}번 카드`); return act('peekSelf', { idx: i }); }
    if (ab?.type === 'swap') return setSel(x => x[0] === i ? [] : [i]);
    if (mode === 'pair') return setSel(x => x.includes(i) ? x.filter(y => y !== i) : x.concat(i).slice(-2));
  };
  const tapOther = (pid, i) => {
    if (!myTurn || busy) return;
    if (ab?.type === 'peekOther') { showPeek([s.hands[pid][i]], `${nameOf(pid)}의 ${i + 1}번 카드`); return act('peekOther', { target: pid, idx: i }); }
    if (ab?.type === 'swap') { if (sel.length !== 1) return say('먼저 내 카드 1장을 고르세요'); return act('swapCards', { myIdx: sel[0], target: pid, idx: i }); }
  };
  const mineSelectable = myTurn && (pend || ab?.type === 'peekSelf' || ab?.type === 'swap' || mode === 'pair');
  const othersSelectable = myTurn && (ab?.type === 'peekOther' || (ab?.type === 'swap' && sel.length === 1));

  let status;
  if (s.status === 'roundEnd' || s.status === 'gameEnd') status = s.status === 'gameEnd' ? '게임이 끝났어요!' : `${s.round}라운드가 끝났어요`;
  else if (!myTurn) status = `${nameOf(DOK.cur(s))}의 차례${s.caller ? ` · ${nameOf(s.caller)}가 셈을 외쳤어요` : ''}`;
  else if (pend) status = pend.from === 'deck' ? '내 카드를 눌러 바꾸거나, 버리세요' : '바꿀 내 카드를 누르세요';
  else if (ab?.type === 'peekSelf') status = '몰래 볼 내 카드를 누르세요';
  else if (ab?.type === 'peekOther') status = '몰래 볼 다른 사람 카드를 누르세요';
  else if (ab?.type === 'swap') status = sel.length ? '이제 맞바꿀 다른 사람 카드를 누르세요' : '맞바꿀 내 카드를 먼저 누르세요';
  else if (mode === 'pair') status = `짝으로 버릴 카드 2장을 고르세요 (${sel.length}/2)`;
  else status = '내 차례예요! 무엇을 할까요?';

  const pk = pend ? s.cards[pend.card] : null, pkKind = pk ? DOK.KINDS[pk.k] : null;
  const topDiscard = s.discard[s.discard.length - 1];
  const others = s.players.filter(p => p.id !== myId);
  const renderLog = t => t.replace(/\{([^}]+)\}/g, (_, id) => nameOf(id));

  return html`<div class="stack">
    <div class="opps">${others.map(p => html`<div key=${p.id} class=${'opp' + (s.status === 'play' && DOK.cur(s) === p.id ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><span class="name"><span>${p.nick}</span>${s.caller === p.id ? html`<span class="chip">셈!</span>` : null}</span>
        <span class="small">누적 <span class="score">${s.scores?.[p.id] ?? 0}</span></span></div>
      <div class="cards-row">${(s.hands[p.id] || []).map((c, i) => html`<${DCard} key=${c} c=${c} cards=${s.cards} size="sm" hidden=${s.status === 'play'}
        selectable=${othersSelectable} onClick=${othersSelectable ? () => tapOther(p.id, i) : null} />`)}</div>
    </div>`)}</div>

    <div class="table">
      <div class="pile"><${DCard} hidden size="lg" onClick=${myTurn && !pend && !ab && !mode && !busy ? () => act('draw') : null} selectable=${myTurn && !pend && !ab && !mode} />
        <span class="cap">덱 ${s.deck.length}장</span></div>
      ${s.pending ? html`<div class="pile"><${DCard} c=${s.pending.card} cards=${s.cards} size="lg" hidden=${!myTurn && s.pending.from === 'deck'} flash />
        <span class="cap">${myTurn ? '가져온 카드' : `${nameOf(DOK.cur(s))}가 든 카드`}</span></div>` : null}
      <div class="pile"><${DCard} c=${topDiscard} cards=${s.cards} size="lg" onClick=${myTurn && !pend && !ab && !mode && topDiscard && hand.length && !busy ? () => act('takeDiscard') : null}
        selectable=${myTurn && !pend && !ab && !mode && !!topDiscard && hand.length > 0} /><span class="cap">버림더미</span></div>
    </div>

    <div class="status" role="status">${status}</div>

    ${playing ? html`<div class=${'me' + (myTurn ? ' turn' : '')}>
      <div class="row" style="justify-content:space-between"><b>${nameOf(myId)} (나)</b><span class="small">누적 <span class="score">${s.scores?.[myId] ?? 0}</span></span></div>
      <div class="cards-row">${hand.map((c, i) => html`<${DCard} key=${c} c=${c} cards=${s.cards} hidden=${s.status === 'play'} selectable=${mineSelectable}
        selected=${sel.includes(i)} onClick=${mineSelectable ? () => tapMine(i) : null} />`)}</div>

      ${myTurn ? html`<div class="actions">
        ${pend && pend.from === 'deck' ? html`
          ${pkKind.ability ? html`<button class="btn primary wide" disabled=${busy} onClick=${() => act('discardPending', { useAbility: true })}>버리고 능력 쓰기: ${pkKind.desc.replace('버리면: ', '')}</button>` : null}
          <button class="btn wide" disabled=${busy} onClick=${() => act('discardPending', { useAbility: false })}>그냥 버리기</button>` : null}
        ${ab ? html`<button class="btn wide" disabled=${busy} onClick=${() => act('skipAbility')}>능력 쓰지 않기</button>` : null}
        ${!pend && !ab && mode !== 'pair' ? html`
          <button class="btn jade" disabled=${busy} onClick=${() => act('draw')}>덱에서 뽑기</button>
          <button class="btn" disabled=${busy || !topDiscard || !hand.length} onClick=${() => act('takeDiscard')}>버림더미 가져오기</button>
          <button class="btn" disabled=${busy || hand.length < 2} onClick=${() => { setMode('pair'); setSel([]); }}>짝 버리기</button>
          <button class="btn primary" disabled=${busy || !!s.caller || s.turnsPlayed < s.players.length} onClick=${() => act('call')}>셈! (끝내기)</button>` : null}
        ${mode === 'pair' ? html`<button class="btn" onClick=${() => { setMode(null); setSel([]); }}>취소</button>
          <button class="btn primary" disabled=${busy || sel.length !== 2} onClick=${() => act('pair', { idx: sel })}>공개해서 버리기</button>` : null}
      </div>` : null}
    </div>` : html`<p class="muted small" style="text-align:center">구경 중이에요. 다음 게임부터 참가할 수 있어요.</p>`}

    <div class="log">${(s.log || []).slice(0, 5).map((l, i) => html`<div key=${i}>${l.who ? html`<b>${nameOf(l.who)}</b> ` : null}${renderLog(l.text)}</div>`)}</div>

    ${initPeek ? html`<div class="overlay"><div class="sheet stack" style="text-align:center">
      <h2>${s.round}라운드 · 내 왼쪽 카드 2장</h2><p class="muted small">이 두 장만 볼 수 있어요. 잘 기억하세요!</p>
      <div class="row" style="justify-content:center;gap:12px">${hand.slice(0, 2).map(c => html`<${DCard} key=${c} c=${c} cards=${s.cards} size="lg" flash />`)}</div>
      <div class="row" style="justify-content:center;gap:12px;color:var(--muted)"><span>1번</span><span style="width:60px"></span><span>2번</span></div>
      <button class="btn primary" onClick=${() => { ls.set(`peek-${s.code}-${s.round}`, true); setInitPeek(false); }}>기억했어요</button></div></div>` : null}

    ${peek ? html`<div class="overlay" onClick=${() => setPeek(null)}><div class="sheet stack" style="text-align:center"><h2>${peek.title}</h2>
      <div class="row" style="justify-content:center;gap:12px">${peek.cards.map(c => html`<${DCard} key=${c} c=${c} cards=${s.cards} size="lg" flash />`)}</div>
      <p class="small muted">3초 뒤에 사라져요</p></div></div>` : null}

    ${(s.status === 'roundEnd' || s.status === 'gameEnd') ? html`<${Result} s=${s} myId=${myId} nameOf=${nameOf} isHost=${isHost} busy=${busy}
      next=${() => commit(st => DOK.newRound(st))} again=${() => commit(st => DOK.newRound({ ...st, scores: null, round: 0 }))} close=${close} />` : null}
  </div>`;
}

function Result({ s, myId, nameOf, isHost, busy, next, again, close }) {
  const order = s.players.slice().sort((a, b) => s.scores[a.id] - s.scores[b.id]);
  const over = s.status === 'gameEnd';
  return html`<div class="overlay"><div class="sheet stack">
    <h2>${over ? `🏆 ${nameOf(order[0].id)} 우승!` : `${s.round}라운드 결과`}</h2>
    ${s.caller ? html`<p class="small">${nameOf(s.caller)}의 셈! ${s.result.callerWon ? '성공 — 0점' : `실패 — +${DOK.CALL_PENALTY}점 벌칙`}</p>` : null}
    ${s.players.map(p => html`<div key=${p.id} class="stack" style="gap:4px"><span class="small"><b>${p.nick}</b> · 합계 ${s.result.sums[p.id]}</span>
      <div class="cards-row" style="margin:0">${(s.hands[p.id] || []).map(c => html`<${DCard} key=${c} c=${c} cards=${s.cards} size="sm" />`)}</div></div>`)}
    <table class="result"><thead><tr><th>이름</th><th>이번 라운드</th><th>누적</th></tr></thead><tbody>
      ${order.map(p => html`<tr key=${p.id}><td>${p.nick}${p.id === myId ? ' (나)' : ''}</td><td>+${s.result.add[p.id]}</td><td class="score">${s.scores[p.id]}</td></tr>`)}</tbody></table>
    <p class="small muted">누군가 누적 ${DOK.GOAL}점을 넘으면 게임이 끝나고, 가장 낮은 사람이 이겨요.</p>
    ${isHost ? (over ? html`<div class="row"><button class="btn primary" style="flex:1" disabled=${busy} onClick=${again}>새 게임</button><button class="btn" onClick=${close}>방 닫기</button></div>`
                     : html`<button class="btn primary" disabled=${busy} onClick=${next}>다음 라운드</button>`)
             : html`<p class="small muted">방장이 ${over ? '새 게임을' : '다음 라운드를'} 시작하기를 기다려요</p>`}
  </div></div>`;
}


function Icon() { return html`<div class="row" style="gap:3px">
  <${DCard} c="a" cards=${{ a: { k: 'n', v: 3 } }} size="sm" /><${DCard} c="b" cards=${{ b: { k: 'swap', v: 8 } }} size="sm" /><${DCard} hidden size="sm" /></div>`; }
GAMES.push({ id: 'dokkaebi', name: '도깨비 셈', who: '2~6명 · 15분', min: 2, max: 6,
  blurb: '뒤집힌 카드를 기억하고 바꿔치기해서 합계를 가장 낮게 만드는 눈치 카드게임',
  start: s => DOK.newRound(s), act: DOK.act, Board, Rules, Icon });
})();
