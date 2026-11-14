'use strict';
/* 게임: 도깨비 마을 (오리지널 정체 숨기기 게임, 전래 마피아 놀이 방식) */
const VIL = (() => {
  const ROLES = {
    dok:    { name: '도깨비', team: 'dok', desc: '밤마다 다른 도깨비와 함께 마을 사람 한 명을 홀려 데려가요. 낮에는 시치미를 떼세요.' },
    mudang: { name: '무당',   team: 'vil', desc: '밤마다 한 명을 골라 그 사람이 도깨비인지 알아내요.' },
    uiwon:  { name: '의원',   team: 'vil', desc: '밤마다 한 명을 지켜요. 도깨비가 그 사람을 노리면 구해 내요. 같은 사람을 이틀 연속 지킬 수 없어요.' },
    vil:    { name: '마을 사람', team: 'vil', desc: '특별한 힘은 없지만, 낮 투표에서 도깨비를 찾아내는 게 가장 중요해요.' },
  };
  const alive = s => s.players.filter(p => s.alive[p.id]).map(p => p.id);
  const teamOf = (s, pid) => ROLES[s.roles[pid]].team;
  function start(s0) {
    const s = clone(s0), n = s.players.length;
    const deck = ['dok'].concat(n >= 6 ? ['dok'] : [], ['mudang'], n >= 5 ? ['uiwon'] : []);
    while (deck.length < n) deck.push('vil');
    const shuffled = shuffle(deck); s.roles = {}; s.alive = {};
    s.players.forEach((p, i) => { s.roles[p.id] = shuffled[i]; s.alive[p.id] = true; });
    Object.assign(s, { status: 'play', phase: 'night', day: 1, night: {}, votes: {}, seen: {}, lastGuard: null, news: null, winner: null, log: [] });
    pushLog(s, null, '첫날 밤이 되었어요. 모두 자기 역할을 확인하세요');
    return s;
  }
  const winCheck = s => {
    const al = alive(s), d = al.filter(id => teamOf(s, id) === 'dok').length;
    if (d === 0) { s.winner = 'vil'; s.status = 'end'; }
    else if (d >= al.length - d) { s.winner = 'dok'; s.status = 'end'; }
  };
  // 밤 결과 (방장 폰이 모두 낸 뒤 실행)
  function resolveNight(s0) {
    const s = clone(s0), al = alive(s);
    if (s.phase !== 'night') throw Error('밤이 아니에요');
    if (!al.every(id => s.night && s.night[id])) throw Error('아직 다 고르지 않았어요');
    const pickBy = role => s.players.filter(p => s.alive[p.id] && s.roles[p.id] === role).map(p => s.night[p.id]);
    const dokPicks = pickBy('dok').filter(t => t !== 'sleep' && s.alive[t] && teamOf(s, t) !== 'dok');
    const tally = {}; dokPicks.forEach(t => tally[t] = (tally[t] || 0) + 1);
    const victim = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || null;
    const guard = pickBy('uiwon')[0]; const guarded = guard && guard !== 'sleep' ? guard : null;
    s.players.filter(p => s.alive[p.id] && s.roles[p.id] === 'mudang').forEach(p => {
      const t = s.night[p.id]; if (t && t !== 'sleep' && s.roles[t]) { s.seen[p.id] = s.seen[p.id] || {}; s.seen[p.id][t] = s.roles[t] === 'dok'; } });
    if (victim && victim !== guarded) { s.alive[victim] = false; s.news = { day: s.day, victim, saved: false }; pushLog(s, victim, `${s.day}일째 밤, 도깨비에게 홀려 사라졌어요`); }
    else { s.news = { day: s.day, victim: null, saved: !!victim }; pushLog(s, null, victim ? '지난밤 의원이 누군가를 구해 냈어요!' : '지난밤엔 아무 일도 없었어요'); }
    s.lastGuard = guarded; s.night = {}; s.votes = {}; s.phase = 'day';
    winCheck(s); return s;
  }
  function resolveDay(s0) {
    const s = clone(s0), al = alive(s);
    if (s.phase !== 'day') throw Error('낮이 아니에요');
    if (!al.every(id => s.votes && s.votes[id])) throw Error('아직 다 투표하지 않았어요');
    const tally = {}; al.forEach(id => { const v = s.votes[id]; if (v !== 'skip' && s.alive[v]) tally[v] = (tally[v] || 0) + 1; });
    const sorted = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
    const out = sorted.length && (sorted.length === 1 || tally[sorted[0]] > tally[sorted[1]]) && tally[sorted[0]] * 2 > 0 ? sorted[0] : null;
    s.lastVote = { day: s.day, tally, out };
    if (out) { s.alive[out] = false; pushLog(s, out, `투표로 쫓겨났어요. 정체는… ${ROLES[s.roles[out]].name}!`); }
    else pushLog(s, null, '표가 갈려서 아무도 쫓겨나지 않았어요');
    s.votes = {}; s.night = {}; s.phase = 'night'; s.day++;
    winCheck(s); return s;
  }
  function act(s, pid, type) {
    if (type === 'resolveNight') return resolveNight(s);
    if (type === 'resolveDay') return resolveDay(s);
    throw Error('알 수 없는 행동');
  }
  // 동시 제출 검사 (각자 내 칸만 씀)
  function validNight(s, pid, target) {
    if (s.status !== 'play' || s.phase !== 'night' || !s.alive[pid]) return false;
    const role = s.roles[pid];
    if (target === 'sleep') return role === 'vil' || role === 'dok' || role === 'mudang' || role === 'uiwon';
    if (!s.alive[target]) return false;
    if (role === 'dok') return teamOf(s, target) !== 'dok';
    if (role === 'mudang') return target !== pid;
    if (role === 'uiwon') return target !== s.lastGuard;
    return true; // 마을 사람: 아무나 '눈치 보기' 지목 (결과 없음)
  }
  return { ROLES, start, act, alive, resolveNight, resolveDay, validNight, teamOf };
})();

(() => {
function Rules({ onClose }) {
  return html`<${Overlay} onClose=${onClose}><div class="rules">
    <h2>도깨비 마을 규칙</h2>
    <p>마을에 도깨비가 숨어들었어요! 모두 비밀 역할을 받고, 밤과 낮을 번갈아 보내요. 4~8명이 함께 해요.</p>
    <h3>역할</h3><ul>${Object.values(VIL.ROLES).map(r => html`<li key=${r.name}><b>${r.name}</b> — ${r.desc}</li>`)}</ul>
    <p class="small muted">4명: 도깨비 1·무당 1·마을 사람 2 / 5명: 의원 추가 / 6명 이상: 도깨비 2</p>
    <h3>밤</h3><ul><li>모두 폰으로 한 명을 골라요. 힘이 없는 마을 사람도 아무나 골라요. 그래야 누가 힘을 쓰는지 티가 안 나요.</li>
      <li>모두 고르면 밤이 끝나고, 도깨비에게 홀린 사람이 있으면 발표돼요. 사라진 사람은 그때부터 구경만 해요.</li></ul>
    <h3>낮</h3><ul><li>얼굴 보며 실컷 토론한 뒤, 각자 쫓아낼 사람에게 투표해요. 가장 많은 표를 받은 사람이 쫓겨나고 정체가 공개돼요. 동점이면 아무도 안 쫓겨나요.</li></ul>
    <h3>승리</h3><ul><li><b>마을 팀:</b> 도깨비를 모두 쫓아내면 이겨요.</li><li><b>도깨비 팀:</b> 도깨비 수가 나머지 수와 같아지면 이겨요.</li></ul>
    <div class="row" style="margin-top:12px"><button class="btn primary" style="flex:1" onClick=${onClose}>알겠어요</button></div></div><//>`;
}

function Board({ room: s, me, busy, commit, patch, nameOf, isHost, close, restart }) {
  const myId = me.id, role = s.roles?.[myId], R = role && VIL.ROLES[role], amAlive = !!s.alive?.[myId];
  const [showRole, setShowRole] = useState(false);
  const [pick, setPick] = useState(null);
  const al = VIL.alive(s);
  const mine = s.phase === 'night' ? s.night?.[myId] : s.votes?.[myId];
  const doneCount = al.filter(id => (s.phase === 'night' ? s.night : s.votes)?.[id]).length;
  useEffect(() => { setPick(null); }, [s.phase, s.day]);
  // 방장 폰: 모두 내면 자동으로 결과 처리
  useEffect(() => {
    if (!isHost || s.status !== 'play' || busy) return;
    if (doneCount === al.length) commit(st => { try { return VIL.act(st, myId, st.phase === 'night' ? 'resolveNight' : 'resolveDay'); } catch { return null; } });
  }, [doneCount, s.phase, s.day, isHost]);
  const submit = async () => {
    if (!pick || !VIL.validNight(s, myId, pick) && s.phase === 'night') return;
    await patch(s.phase === 'night' ? { night: { [myId]: pick } } : { votes: { [myId]: pick } });
  };
  const fellow = role === 'dok' ? s.players.filter(p => p.id !== myId && s.roles[p.id] === 'dok').map(p => p.nick) : [];
  const seen = s.seen?.[myId] || {};
  const canTarget = id => s.phase === 'night' ? VIL.validNight(s, myId, id) : s.alive[id];
  const prompt = s.phase === 'night'
    ? ({ dok: '오늘 밤 홀릴 사람을 고르세요', mudang: '정체를 알아볼 사람을 고르세요', uiwon: '오늘 밤 지킬 사람을 고르세요', vil: '눈치 보기: 아무나 한 명 고르세요 (효과 없음)' })[role]
    : '쫓아낼 사람에게 투표하세요';
  const seeAll = s.status === 'end' || !amAlive;
  return html`<div class="stack">
    <div class="status" role="status">${s.status === 'end' ? (s.winner === 'vil' ? '마을 팀 승리! 도깨비를 모두 쫓아냈어요' : '도깨비 팀 승리! 마을이 홀렸어요')
      : `${s.day}일째 ${s.phase === 'night' ? '밤 🌙' : '낮 ☀'} · ${doneCount}/${al.length}명 ${s.phase === 'night' ? '고름' : '투표'}`}</div>
    ${s.news && s.phase === 'day' && s.status === 'play' ? html`<div class="sheet" style="padding:14px"><b>지난밤 소식</b><p style="margin:4px 0 0">${s.news.victim ? `${josa(nameOf(s.news.victim), '이', '가')} 도깨비에게 홀려 사라졌어요.` : s.news.saved ? '도깨비가 노렸지만 의원이 구해 냈어요!' : '조용한 밤이었어요.'} 이제 토론하고 투표하세요.</p></div>` : null}
    <button class="btn" onClick=${() => setShowRole(true)}>${amAlive ? '내 역할 몰래 보기' : '나는 사라졌어요 · 내 역할 보기'}</button>
    ${s.status === 'play' && amAlive ? html`<div class="me turn stack">
      <b>${prompt}</b>
      ${mine ? html`<p class="muted small">${s.phase === 'night' ? '골랐어요' : '투표했어요'}: ${mine === 'sleep' ? '아무도 안 고름' : mine === 'skip' ? '기권' : nameOf(mine)} · 다른 사람을 기다리는 중…</p>` : null}
      <div class="plist">${s.players.map(p => html`<button key=${p.id} class=${'pbtn' + (pick === p.id ? ' on' : '') + (!s.alive[p.id] ? ' dead' : '')}
          disabled=${!!mine || !canTarget(p.id) || busy} onClick=${() => setPick(p.id)}>
        <span>${p.nick}${p.id === myId ? ' (나)' : ''}${fellow.includes(p.nick) ? ' · 같은 도깨비' : ''}</span>
        <span class="small muted">${p.id in seen ? (seen[p.id] ? '도깨비!' : '사람') : !s.alive[p.id] ? VIL.ROLES[s.roles[p.id]].name : ''}${s.phase === 'day' && s.lastVote && false ? '' : ''}</span></button>`)}</div>
      ${!mine ? html`<div class="actions">
        <button class="btn" disabled=${busy} onClick=${() => patch(s.phase === 'night' ? { night: { [myId]: 'sleep' } } : { votes: { [myId]: 'skip' } })}>${s.phase === 'night' ? '아무도 안 고르기' : '기권'}</button>
        <button class="btn primary" disabled=${!pick || busy} onClick=${submit}>${s.phase === 'night' ? '고르기' : '투표하기'}</button></div>` : null}
    </div>` : null}
    ${s.status === 'play' && !amAlive ? html`<div class="me stack"><b>구경 중</b>${s.players.map(p => html`<span key=${p.id} class="small">${p.nick}: ${VIL.ROLES[s.roles[p.id]].name}${s.alive[p.id] ? '' : ' (사라짐)'}</span>`)}</div>` : null}
    ${isHost && s.status === 'play' && doneCount < al.length ? html`<p class="small muted" style="text-align:center">방장 폰이 모두 고르면 자동으로 다음 단계로 넘겨요. 방장은 이 화면을 켜 두세요.</p>` : null}
    <${LogList} log=${s.log} nameOf=${nameOf} />
    ${showRole ? html`<${Overlay} onClose=${() => setShowRole(false)}><div class="role"><span class="small">나의 역할</span><div class="big">${R.name}</div><p>${R.desc}</p>
      ${fellow.length ? html`<p><b>같은 편 도깨비:</b> ${fellow.join(', ')}</p>` : null}
      ${Object.keys(seen).length ? html`<p><b>알아낸 정체:</b> ${Object.entries(seen).map(([id, d]) => `${nameOf(id)}=${d ? '도깨비' : '사람'}`).join(', ')}</p>` : null}</div>
      <button class="btn primary" onClick=${() => setShowRole(false)}>닫기</button><//>` : null}
    ${s.status === 'end' ? html`<${Overlay}><h2>${s.winner === 'vil' ? '🏮 마을 팀 승리!' : '👹 도깨비 팀 승리!'}</h2>
      <table class="result"><tbody>${s.players.map(p => html`<tr key=${p.id}><td>${p.nick}</td><td>${VIL.ROLES[s.roles[p.id]].name}</td><td>${s.alive[p.id] ? '살아남음' : '사라짐'}</td></tr>`)}</tbody></table>
      ${isHost ? html`<div class="row"><button class="btn primary" style="flex:1" disabled=${busy} onClick=${restart}>한 판 더</button><button class="btn" onClick=${close}>방 닫기</button></div>` : html`<p class="small muted">방장이 다음 판을 시작하기를 기다려요</p>`}<//>` : null}
  </div>`;
}
function Icon() { return html`<div class="display" style="font-size:40px;color:var(--moon)">鬼</div>`; }
GAMES.push({ id: 'village', name: '도깨비 마을', who: '4~8명 · 15분 · 토론', min: 4, max: 8, blurb: '비밀 역할을 받고 밤에는 몰래 힘을 쓰고, 낮에는 토론해서 숨은 도깨비를 쫓아내는 게임',
  start: VIL.start, act: VIL.act, Board, Rules, Icon });
})();
