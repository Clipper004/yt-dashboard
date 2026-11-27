/* ===== Multiple channels ===== */
let CH = [{label:CONFIG.CHANNEL_LABEL, id:CONFIG.CHANNEL_ID, handle:CONFIG.HANDLE, token:CONFIG.ACCESS_TOKEN}, ...CONFIG.EXTRA_CHANNELS.map((c,i) => ({label:c.label||c.id||c.handle, id:c.id||"", handle:c.handle||"", token:c.token||""}))];
const BASE = CH.length; let cur = 0;
try { (JSON.parse(localStorage.getItem("ytd_channels")||"[]")).forEach(c => CH.push({label:c.label, id:c.id||"", handle:c.handle||"", token:"", saved:true})); } catch(e){}
const unlockKey = id => "ytd_unlocked_" + id;
function wasUnlocked(id){ try { return sessionStorage.getItem(unlockKey(id)) === "1"; } catch(e){ return false; } }
try { const saved = localStorage.getItem("ytd_selected_channel"), i = CH.findIndex(c => (c.id || c.handle) === saved); if (i > 0 && (!CONFIG.LOCKS[CH[i].id] || wasUnlocked(CH[i].id))) cur = i; } catch(e){}
function saveChs(){ try { localStorage.setItem("ytd_channels", JSON.stringify(CH.filter(c=>c.saved).map(c=>({label:c.label,id:c.id,handle:c.handle})))); } catch(e){} }
const IC_CHECK='<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>';
const IC_LOCK='<svg class="ic" style="color:var(--dim)" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="7" width="9.6" height="6.6" rx="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7"/></svg>';
function renderSel(){
  const nm = c => (c.label||c.id||c.handle||"Channel").trim();
  $("ddn").textContent = nm(CH[cur]); $("ddav").textContent = nm(CH[cur]).charAt(0).toUpperCase();
  $("ddl").innerHTML = CH.map((c,i) => { const n = nm(c), locked = !!CONFIG.LOCKS[c.id] && i !== cur;
    return `<li><button type="button" role="option" aria-selected="${i===cur}" class="${i===cur?"sel":""}" data-i="${i}"><span class="dav">${esc(n.charAt(0).toUpperCase())}</span><span class="dn">${esc(n)}</span>${i===cur?IC_CHECK:locked?IC_LOCK:""}</button></li>`; }).join("")
    + '<li><hr></li><li><button type="button" data-add="1"><span class="dav plus">+</span><span class="dn">Add a channel</span></button></li>';
}
function toggleDd(){ const o = !$("dd").classList.contains("open"); $("dd").classList.toggle("open", o); $("ddb").setAttribute("aria-expanded", o); }
function closeDd(){ const dd = $("dd"); if (dd){ dd.classList.remove("open"); $("ddb").setAttribute("aria-expanded","false"); } }
function initUI(){
  $("ddl").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.preventDefault(); e.stopPropagation(); closeDd(); if (b.dataset.add) openAdd(); else if (+b.dataset.i !== cur) switchCh(+b.dataset.i); });
  const anRange=$("anRange");
  if (anRange){
    try { if (["7","28","90"].includes(localStorage.getItem("ytd_analytics_range"))) anRange.value=localStorage.getItem("ytd_analytics_range"); } catch(e){}
    anRange.addEventListener("change",()=>{ try{localStorage.setItem("ytd_analytics_range",anRange.value)}catch(e){} renderAnalytics(); });
  }
  $("p_in").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); checkPw(); } });
  document.querySelector("#pmodal .btns button").addEventListener("click", e => { e.preventDefault(); checkPw(); });
  document.querySelectorAll("#pmodal .btns button")[1].addEventListener("click", closePw);
  document.addEventListener("click", e => { if (!$("dd").contains(e.target)) closeDd(); });
  tick(); setInterval(tick, 1000);
}
function applyCh(){ const c = CH[cur]; CONFIG.CHANNEL_ID = c.id; CONFIG.HANDLE = c.handle; CONFIG.ACCESS_TOKEN = c.token || ""; }
let pendingCh = -1;
function switchCh(i){
  if (!Number.isInteger(i) || i < 0 || i >= CH.length) return;
  closeDd();
  const lock = CONFIG.LOCKS[CH[i].id];
  if (!lock || i === cur){ doSwitch(i); return; }
  pendingCh = i;
  document.getElementById("p_for").textContent = "Enter the password to open " + (CH[i].label || "this channel") + ".";
  document.getElementById("p_in").value = "";
  document.getElementById("p_warn").textContent = "";
  document.getElementById("pmodal").classList.add("on");
  requestAnimationFrame(() => document.getElementById("p_in").focus());
}
function closePw(){ document.getElementById("pmodal").classList.remove("on"); pendingCh = -1; renderSel(); }
let checkingPw = false;
async function checkPw(){
  if (checkingPw) return;
  const w = document.getElementById("p_warn"), i = pendingCh;
  if (i < 0 || i >= CH.length) return;
  if (!(window.crypto && crypto.subtle)){ w.textContent = "This browser can't check passwords on this address. Open the page over https or http://localhost."; return; }
  checkingPw = true;
  w.textContent = "Checking…";
  try {
    const password = document.getElementById("p_in").value;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(CONFIG.LOCK_SALT + password));
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
    if (hex === CONFIG.LOCKS[CH[i].id]){
      document.getElementById("pmodal").classList.remove("on");
      document.getElementById("p_in").value = "";
      w.textContent = "";
      try { sessionStorage.setItem(unlockKey(CH[i].id), "1"); } catch(e){}
      pendingCh = -1;
      doSwitch(i);
    } else {
      w.textContent = "Wrong password.";
      document.getElementById("p_in").select();
    }
  } catch(e){ w.textContent = "Could not verify the password. Try again."; }
  finally { checkingPw = false; }
}
function doSwitch(i){
  cur = i; applyCh(); TOKEN = null; AN = null; WH365 = null; SNAP = []; ANR = false; lastAnSlot = -1; closeDd();
  closePw();
  try { localStorage.setItem("ytd_selected_channel", CH[cur].id || CH[cur].handle); } catch(e){}
  const selected = CH[cur], selectedId = selected.id;
  const snapshot = CONFIG.ACCESS_TOKEN.length >= 20 || !selectedId ? null : loadSnapshot(false, false, true);
  document.getElementById("apitch").style.display = ""; document.getElementById("abody").style.display = "none";
  document.getElementById("snap_status").textContent = "Loading the shared Analytics report…";
  renderSel();
  boot().then(async () => {
    if (CONFIG.ACCESS_TOKEN.length >= 20){ TOKEN = CONFIG.ACCESS_TOKEN; loadAnalytics(); }
    else if (snapshot){ const report = await snapshot; if (report && CH[cur] === selected && D?.id === selectedId) applySnapshot(report, selectedId); }
    else loadSnapshot();
  });
}
function openAdd(){ document.getElementById("a_warn").textContent = ""; document.getElementById("a_rm").style.display = CH[cur].saved ? "" : "none"; document.getElementById("amodal").classList.add("on"); document.getElementById("a_id").focus(); }
function closeAdd(){ document.getElementById("amodal").classList.remove("on"); }
function addCh(){
  const v = id => document.getElementById(id).value.trim(), raw = v("a_id"), w = document.getElementById("a_warn");
  if (!raw){ w.textContent = "Enter a channel ID (starts with UC) or an @handle."; return; }
  const isId = /^UC[\w-]{22}$/.test(raw), isHandle = raw[0] === "@";
  if (!isId && !isHandle){ w.textContent = "That should be a 24-character ID starting with UC, or an @handle."; return; }
  const tok = (v("a_tok").match(/access_token=([^&\s#]+)/) || [,v("a_tok")])[1] || "";
  CH.push({label:v("a_label") || raw, id:isId?raw:"", handle:isHandle?raw:"", token:tok, saved:true}); saveChs();
  ["a_label","a_id","a_tok"].forEach(x => document.getElementById(x).value = ""); closeAdd(); switchCh(CH.length-1);
}
function removeCh(){ if (!CH[cur].saved) return; CH.splice(cur,1); saveChs(); closeAdd(); switchCh(0); }

const $ = id => document.getElementById(id);
const fmt = n => n >= 1e6 ? (n/1e6).toFixed(2)+"M" : n >= 1e4 ? (n/1e3).toFixed(1)+"K" : Math.round(n).toLocaleString();
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SINGAPORE_WEEKDAY = new Intl.DateTimeFormat("en-US", {timeZone:"Asia/Singapore",weekday:"short"});
const STOP = new Set("the a an of in on to and for is are was with this that how why what you your i it at by from or as be vs".split(" "));
const POWER = ["secret","truth","shocking","never","best","worst","insane","real","why","how","exposed","ranked","impossible","most","least","hidden","crazy","new"];
let charts = {}, D = null, CUR = null, SNAP = [], WH365 = null, busy = false, lastUpdate = 0, lastTry = 0, lastSlot = -1, lastAnSlot = -1, RKEY = null, ANR = false, bootN = 0;
const SUPPLEMENTAL_LOADS = new Map();

/* ===== Smooth updates: patch the live DOM and shuffle only the digits that changed ===== */
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SH = new Set(); let shRaf = 0;
function shStep(now){
  SH.forEach(a => {
    const t = now - a.t0, tk = now - a.last > 55; if (tk) a.last = now;
    let s = "", open = false;
    for (let i = 0; i < a.to.length; i++){
      const lk = a.lock[i];
      if (lk === undefined || t >= lk) s += a.to[i];
      else { if (tk || a.rnd[i] === undefined) a.rnd[i] = (Math.random()*10)|0; s += a.rnd[i]; open = true; }
    }
    if (!open){ s = a.to; SH.delete(a); a.node._sh = null; }
    a.node.nodeValue = s;
  });
  shRaf = SH.size ? requestAnimationFrame(shStep) : 0;
}
const shufflable = (a, b) => /\d/.test(a) && /\d/.test(b) && (b.match(/[A-Za-z]/g) || []).length <= 12 && Math.abs(a.length - b.length) <= 3;
function shuffleText(node, from, to){
  const lock = [], n = to.length; let k = 0;
  for (let i = 0; i < n; i++){ const j = from.length - n + i, oc = j >= 0 ? from[j] : ""; if (/\d/.test(to[i]) && to[i] !== oc) lock[i] = 420 + 80 * Math.min(k++, 7); }
  if (!k){ node.nodeValue = to; return; }
  const a = {node, to, lock, rnd:[], last:0, t0:performance.now()};
  node._sh = a; SH.add(a); if (!shRaf) shRaf = requestAnimationFrame(shStep);
}
function setText(node, to){
  const cur = node._sh ? node._sh.to : node.nodeValue;
  if (cur === to) return;
  if (node._sh){ SH.delete(node._sh); node._sh = null; }
  if (!REDUCE && shufflable(cur, to)) shuffleText(node, cur, to); else node.nodeValue = to;
}
function syncAttrs(a, b){
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name) && !at.name.startsWith("data-")) a.removeAttribute(at.name);
  for (const at of b.attributes) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
}
function morphKids(a, b){
  const A = [...a.childNodes], B = [...b.childNodes], n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++){
    const x = A[i], y = B[i];
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName){ a.replaceChild(y, x); continue; }
    if (x.nodeType === 3){ setText(x, y.nodeValue); continue; }
    if (x.nodeType !== 1) continue;
    syncAttrs(x, y);
    if (x.classList.contains("earnings")){ x.textContent = y.textContent; continue; }
    if (x._counting){ x._final = y.textContent; continue; }   // intro count-up still running: it lands on the new value
    morphKids(x, y);
  }
  for (let i = n; i < A.length; i++) a.removeChild(A[i]);
  for (let i = n; i < B.length; i++) a.appendChild(B[i]);
}
function setHTML(el, html, soft){
  if (!soft || !el.firstChild){ el.innerHTML = html; return; }
  const t = el.cloneNode(false); t.innerHTML = html;
  morphKids(el, t);
  el.querySelectorAll(".num").forEach(n => n.dataset.c = 1);
}

function openGuide(){ const t=$("t_scope"); if (t) t.textContent = SCOPE(); $("modal").classList.add("on"); }
function closeGuide(){ $("modal").classList.remove("on"); }
document.addEventListener("keydown", e => { if (e.key === "Escape"){ closeGuide(); closeAdd(); closePw(); closeDd(); } });

async function api(path, params){
  const q = new URLSearchParams({...params, key: CONFIG.API_KEY});
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
  let r;
  try { r = await fetch("https://www.googleapis.com/youtube/v3/" + path + "?" + q, {signal:controller.signal}); }
  catch(e){ if (e.name === "AbortError") throw new Error("YouTube took too long to respond. Try again shortly."); throw e; }
  finally { clearTimeout(timeout); }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "API error " + r.status);
  return j;
}
const dur = iso => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || []; return (+m[1]||0)*3600 + (+m[2]||0)*60 + (+m[3]||0); };

async function live(){
  const ch = await api("channels", {part:"snippet,statistics,contentDetails", ...(CONFIG.CHANNEL_ID ? {id:CONFIG.CHANNEL_ID} : {forHandle:CONFIG.HANDLE})});
  const c = ch.items?.[0]; if (!c) throw new Error("Channel not found. Check CHANNEL_ID or HANDLE.");
  const up = c.contentDetails.relatedPlaylists.uploads, ids = []; let tok = "";
  while (ids.length < CONFIG.MAX_VIDEOS){
    const p = await api("playlistItems", {part:"contentDetails", playlistId:up, maxResults:50, ...(tok?{pageToken:tok}:{})});
    p.items.forEach(i => ids.push(i.contentDetails.videoId)); tok = p.nextPageToken; if (!tok) break;
  }
  const vids = [];
  const batches = [];
  for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i,i+50));
  const results = await Promise.all(batches.map(batch => api("videos", {part:"snippet,statistics,contentDetails", id:batch.join(",")})));
  results.forEach(v => v.items?.forEach(x => vids.push({id:x.id, title:x.snippet.title, pub:new Date(x.snippet.publishedAt), views:+x.statistics.viewCount||0, likes:+x.statistics.likeCount||0, comments:+x.statistics.commentCount||0, dur:dur(x.contentDetails.duration)})));
  return {id:c.id, name:c.snippet.title, img:c.snippet.thumbnails?.default?.url||"", created:new Date(c.snippet.publishedAt), subs:+c.statistics.subscriberCount||0, views:+c.statistics.viewCount||0, hiddenSubs:c.statistics.hiddenSubscriberCount, vids, demo:false};
}

function demo(){
  let s = 7; const rnd = () => (s = (s*16807) % 2147483647) / 2147483647;
  const titles = ["The complete beginner guide","5 mistakes everyone makes","Why this keeps happening","What nobody tells you","I tested every option","The truth about this trend","How it actually works","Ranked from worst to best","Behind the scenes","Things I wish I knew sooner"];
  const vids = []; const now = Date.now();
  for (let i = 0; i < 70; i++){
    const age = (70 - i) * 2.2, short = rnd() < .8, base = (short ? 6000 : 2500) * (0.3 + rnd()*2.4) * (1 + i/60);
    const v = Math.round(base * Math.min(1, 0.25 + age/20));
    vids.push({title: titles[Math.floor(rnd()*titles.length)] + (rnd()<.4?" #shorts":""), pub:new Date(now - age*864e5 - rnd()*864e5), views:v, likes:Math.round(v*(.03+rnd()*.05)), comments:Math.round(v*(.002+rnd()*.004)), dur: short ? 20+Math.round(rnd()*38) : 240+Math.round(rnd()*400)});
  }
  return {name:"Sample Channel (demo data)", img:"", created:new Date(now - 300*864e5), subs:18400, views:vids.reduce((a,v)=>a+v.views,0)*1.1, vids, demo:true};
}

function seoScore(t, topKw){
  let sc = 0; const tips = [], len = t.length, words = t.toLowerCase().match(/[a-z0-9']+/g) || [];
  if (len >= 35 && len <= 65){ sc += 25; } else { tips.push(len < 35 ? "Too short. Aim for 35 to 65 characters." : "Too long, so it may get cut off. Aim for 35 to 65 characters."); sc += len < 20 || len > 90 ? 5 : 14; }
  if (/\d/.test(t)) sc += 12; else tips.push("Add a number (e.g. “5 countries…”). Numbers make titles easier to scan.");
  if (words.some(w => POWER.includes(w))) sc += 15; else tips.push("Add a curiosity word such as why, truth, hidden, or ranked.");
  if (/[?]/.test(t) || /^(why|how|what|who|when)\b/i.test(t)) sc += 10; else tips.push("Framing the title as a question can lift curiosity.");
  const front = words.slice(0, 3);
  if (topKw.some(k => front.includes(k))) sc += 15; else tips.push("Put a main keyword in the first three words.");
  const caps = (t.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (caps <= 1) sc += 8; else tips.push("Too many ALL-CAPS words can look spammy.");
  if (new Set(words).size === words.length) sc += 5;
  if (/#\w+/.test(t)) sc += 5; else tips.push("One relevant hashtag (like #shorts) helps discovery.");
  if (/[\p{Emoji_Presentation}]/u.test(t)) sc += 5;
  return {score: Math.min(100, sc), tips};
}
const cls = s => s >= 70 ? "s-hi" : s >= 45 ? "s-mid" : "s-lo";

function kwStats(vids){
  const m = {};
  const logs = vids.map(v => Math.log(Math.max(1,v7of(v)))), prior = logs.length ? logs.reduce((s,x)=>s+x,0)/logs.length : 0;
  vids.forEach(v => new Set((v.title.toLowerCase().match(/[a-z']{3,}/g) || []).filter(w => !STOP.has(w))).forEach(w => (m[w] = m[w] || []).push(Math.log(Math.max(1,v7of(v))))));
  return Object.entries(m).map(([w,a]) => ({w, n:a.length, avg:Math.exp((a.reduce((x,y)=>x+y,0)+3*prior)/(a.length+3))})).sort((a,b) => b.n-a.n).slice(0,14);
}
const median = a => { const s = [...a].sort((x,y)=>x-y), m = s.length>>1; return s.length ? (s.length%2 ? s[m] : (s[m-1]+s[m])/2) : 0; };
const weightedQuantile = (values, weights, q) => {
  const items = values.map((value,i)=>({value,weight:weights[i]})).filter(x=>Number.isFinite(x.value)&&x.weight>0).sort((a,b)=>a.value-b.value);
  const total = items.reduce((s,x)=>s+x.weight,0), target = total*clamp(q,0,1); let cumulative = 0;
  for (const item of items){ cumulative += item.weight; if (cumulative >= target) return item.value; }
  return items.length ? items[items.length-1].value : 0;
};

/* ===== Growth model + earnings formula ===== */
// A video earns views on a log curve: views(age) ~ ln(1 + age/tau). Shorts burn faster than long-form.
const TAU = {s:1.5, l:3};
const G = (age, short) => Math.log(1 + Math.max(0, age) / (short ? TAU.s : TAU.l));
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// views a video gained between d1 and d2 days ago
const gainWin = (x, d1, d2) => { const q = x.age - d1, p = Math.max(0, x.age - d2); return q <= p ? 0 : x.views * (G(q, x.short) - G(p, x.short)) / G(x.age, x.short); };
const v7of = x => x.views * G(7, x.short) / G(x.age, x.short);   // a video's views, normalised to day 7
const shortShare = (a, d1, d2) => { let s = 0, t = 0; a.v.forEach(x => { const g = gainWin(x, d1, d2); t += g; if (x.short) s += g; }); return t ? s/t : 0; };
const spanText = n => n < 120 ? n + " days" : n < 730 ? Math.round(n/30) + " months" : n < 3650 ? "about " + (n/365).toFixed(1) + " years" : "10+ years";

function weekViews(a){
  const today = dateInZone(new Date(), "America/Los_Angeles"), now = Date.now();
  const rows = AN && AN.day ? AN.day.filter(r => r[0] < today).slice(-7) : [];
  if (consecutiveDays(rows)) return {views: rows.reduce((s,r) => s + (r[1]||0), 0), src:"analytics"};
  if (SNAP.length >= 2){
    const cur = SNAP[SNAP.length-1]; let start = null;
    for (const x of SNAP) if (x.t <= now - 7*864e5) start = x;
    if (start && now - cur.t <= 36*36e5) return {views:Math.max(0,cur.v-start.v),src:"tracked"};
  }
  return {views: a.v.reduce((s,x) => s + gainWin(x, 0, 7), 0) * (a.cal ? a.cal.c : 1), src:"model"};
}

function buildForecast(d, a){
  const v = a.v, now = Date.now();
  // 1) next upload, from the last videos normalised to day 7, recent ones weighted more
  const aged = v.filter(x => x.age >= 1 && x.age <= 90);
  const pick = kind => { const sameFormat = aged.filter(x => x.short === kind).slice(-12); return {videos:sameFormat.length >= 3 ? sameFormat : aged.slice(-12), pooled:sameFormat.length < 3}; };
  const est = ({videos,pooled}) => { if (!videos.length) return null;
    const vals = videos.map(v7of), weights = videos.map(x => Math.pow(.5,x.age/(x.short?28:60))*Math.min(1,x.age/7));
    const total = weights.reduce((s,x)=>s+x,0), squareTotal = weights.reduce((s,x)=>s+x*x,0);
    const mid = Math.exp(vals.reduce((s,y,i)=>s+weights[i]*Math.log(Math.max(1,y)),0)/total);
    return {mid,lo:weightedQuantile(vals,weights,.1),hi:weightedQuantile(vals,weights,.9),n:vals.length,nEff:squareTotal?total*total/squareTotal:0,pooled}; };
  const eS = est(pick(true)), eL = est(pick(false));
  const nextShort = v.slice(-5).filter(x => x.short).length >= 3;
  const nx = (nextShort ? eS : eL) || eS || eL || {mid:0, lo:0, hi:0, n:0, pooled:false};

  // 2) calibrate the model against what the channel really got recently
  const modelWin = (d1, d2) => v.reduce((s,x) => s + gainWin(x, d1, d2), 0);
  let c = 1, cal = {src:"model"};
  const cutoff = dateInZone(new Date(), "America/Los_Angeles");
  const rows = AN && AN.day ? AN.day.filter(r => r[0] < cutoff).slice(-14) : [];
  if (rows.length >= 10 && consecutiveDays(rows)){
    const actual = rows.reduce((s,r) => s + (r[1]||0), 0), e = Math.max(0, (now - zonedTimeMs(rows[rows.length-1][0], 23, 59, 59, "America/Los_Angeles")) / 864e5), m = modelWin(e, e + rows.length);
    if (m > 0 && actual > 0){ c = clamp(actual/m, .3, 4); cal = {src:"analytics", raw:actual/m}; }
  } else if (SNAP.length >= 2){
    const cur = SNAP[SNAP.length-1], f = SNAP[0], span = cur.t - f.t;
    if (span >= 20*36e5){ const actual = cur.v - f.v, m = modelWin(0, span/864e5);
      if (m > 0 && actual > 0){ c = clamp(actual/m, .3, 4); cal = {src:"tracked", span, raw:actual/m}; } }
  }
  cal.c = c; a.cal = cal;
  a.dailyNow = weekViews(a).views / 7;

  // 3) day-by-day projection: existing videos keep decaying, new uploads follow the same curve
  const last10 = v.slice(-10), pS = last10.length ? last10.filter(x => x.short).length / last10.length : 0;
  const chAge = Math.max(7, (now - d.created) / 864e5);
  const lam = .5 * v.filter(x => x.age <= 30).length / Math.min(30, chAge) + .5 * v.filter(x => x.age <= 90).length / Math.min(90, chAge);
  const proj = Array(30).fill(0);
  v.forEach(x => { const g0 = G(x.age, x.short), tot = (G(x.age+30, x.short) - g0) / g0, k = tot > 5 ? 5/tot : 1;
    for (let i = 1; i <= 30; i++) proj[i-1] += c * k * x.views * (G(x.age+i, x.short) - G(x.age+i-1, x.short)) / g0; });
  [[true, pS, eS || eL], [false, 1-pS, eL || eS]].forEach(([sh, p, e]) => { if (!e || !p) return;
    for (let u = 1; u <= 30; u++) for (let dd = u; dd <= 30; dd++) proj[dd-1] += lam * p * e.mid * (G(dd-u+1, sh) - G(dd-u, sh)) / G(7, sh); });
  const total = proj.reduce((s,x) => s + x, 0), rng = cal.src === "analytics" ? [.8, 1.25] : cal.src === "tracked" ? [.7, 1.4] : [.55, 1.7];

  // 4) subscribers: views x conversion rate, blended with real recent net growth when Analytics is on
  const projDaily = total / 30; let perDay = (d.views ? d.subs / d.views : 0) * projDaily, real = false;
  if (AN && AN.day && AN.day.length >= 14){
    const net = r => (r[5]||0) - (r[6]||0), all = AN.day, v90 = all.reduce((s,r) => s + (r[1]||0), 0), n90 = all.reduce((s,r) => s + net(r), 0);
    const l28 = all.slice(-28), n28 = l28.reduce((s,r) => s + net(r), 0) / l28.length;
    perDay = .5 * (v90 ? n90/v90 : 0) * projDaily + .5 * n28; real = true;
  }
  const ms = d.hiddenSubs ? null : [100,500,1e3,5e3,1e4,5e4,1e5,5e5,1e6,5e6,1e7].find(x => x > d.subs) || d.subs*2;
  Object.assign(a, {nextViews:nx.mid, nextLo:nx.lo, nextHi:nx.hi, nextN:nx.n, nextNEff:nx.nEff||0, nextPooled:!!nx.pooled, nextShort, forecast30:total, f30lo:total*rng[0], f30hi:total*rng[1], proj, subsPerDay:perDay, subsCurrent:d.subs, subsHidden:!!d.hiddenSubs, ms, eta: ms != null && perDay > 0 ? Math.ceil((ms - d.subs)/perDay) : null, real});
  return a;
}

/* ----- Revenue estimate fallback: prefer this channel's observed Analytics RPM ----- */
const SHORTS_RATIO = 0.042;
const BENCHMARK_LONG_RPM = 2.5;
const SINGAPORE_LONG_RPM = 4.99;
const money = n => { n = Math.max(0, n); return "$" + (n >= 1e4 ? Math.round(n).toLocaleString() : n.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})); };
const learnedKey = () => "ytd_rpm_" + ((CUR && CUR.id) || CONFIG.CHANNEL_ID);
function getLearned(){
  try {
    const j = JSON.parse(localStorage.getItem(learnedKey()) || "null");
    return j && j.rpm > 0 && j.days >= 14 && j.t > Date.now() - 90*864e5 ? j : null;
  } catch(e){ return null; }
}
function singaporeAudienceShare(){
  if (!AN?.geo?.length || !AN?.day?.length) return null;
  const singapore = AN.geo.find(r => r[0] === "SG"), totalViews = AN.day.reduce((sum,r) => sum + (r[1]||0), 0);
  return singapore && totalViews > 0 ? clamp((singapore[1]||0) / totalViews, 0, 1) : null;
}
function rpmFor(sShare){
  const L = getLearned();
  if (L) return {rpm:L.rpm, src:`your channel's recent Analytics RPM (${L.days} days)`, modeled:false};
  if (CONFIG.RPM_LONG > 0) return {rpm:CONFIG.RPM_LONG * (1 - sShare + sShare * SHORTS_RATIO), src:"your custom RPM setting; Shorts share is estimated", modeled:false};
  const sgShare = singaporeAudienceShare();
  const longRpm = sgShare == null ? BENCHMARK_LONG_RPM : BENCHMARK_LONG_RPM * (1 - sgShare) + SINGAPORE_LONG_RPM * sgShare;
  const geoNote = sgShare == null ? "audience geography unavailable; using a broad benchmark" : `${(sgShare*100).toFixed(0)}% Singapore audience proxy from Analytics; assumes the same country mix by format`;
  return {rpm:longRpm * (1 - sShare + sShare * SHORTS_RATIO), src:`${geoNote}; third-party RPM priors; assumes the channel is monetized`, modeled:true};
}
const estEarn = (rows, sShare) => {
  const {rpm} = rpmFor(sShare);
  return rpm == null ? null : rows.reduce((s,r) => s + (r[1]||0) / 1000 * rpm, 0);
};
function learnRpm(day, rev){
  if (!rev || !rev.length) return;
  const revenue = new Map(rev.map(r => [r[0], r[1]||0])); let usd = 0, views = 0, days = 0;
  day.forEach(r => {
    if (!revenue.has(r[0])) return;
    days++;
    const dailyViews = r[1]||0;
    if (dailyViews > 0){ usd += revenue.get(r[0]); views += dailyViews; }
  });
  if (days < 14 || views < 1000 || usd <= 0) return;
  try { localStorage.setItem(learnedKey(), JSON.stringify({rpm:usd/views*1000, views, days, t:Date.now()})); } catch(e){}
}
function weekEarn(a){
  const today = dateInZone(new Date(), "America/Los_Angeles"), rows = AN && AN.day ? AN.day.filter(r => r[0] < today) : [];
  const last7 = rows.slice(-7), prev7 = rows.slice(-14,-7);
  if (AN?.rev?.length && consecutiveDays(last7)){
    const m = new Map(AN.rev.map(r => [r[0], r[1]||0]));
    if (last7.every(r => m.has(r[0]))){
      const sum = r => r.reduce((s,x) => s + m.get(x[0]), 0);
      const previousIsComplete = consecutiveDays(prev7) && prev7.every(r => m.has(r[0]));
      return {usd:sum(last7), prev: previousIsComplete ? sum(prev7) : null, real:true, note:"Actual figure from the last 7 complete Analytics days. Analytics data may lag by 48–72 hours."};
    }
  }
  const wv = weekViews(a), ss = shortShare(a, 0, 7), r = rpmFor(ss);
  let usd = wv.views / 1000 * r.rpm, prev = null;
  if (r.rpm == null) usd = null;
  if (wv.src === "analytics"){
    usd = estEarn(last7, ss);
    if (consecutiveDays(prev7)) prev = estEarn(prev7, shortShare(a, 7, 14));
  }
  const low = CUR && !CUR.demo && CUR.subs < 1000 ? " Under 1,000 subscribers, so ads may not be paying yet." : "";
  const how = {analytics:"last 7 complete Analytics days", tracked:"tracked views", model:"modelled views"}[wv.src];
  return {usd, prev, real:false, modeled:r.modeled, note:`${fmt(wv.views)} ${how} at about $${r.rpm.toFixed(2)} per 1,000 (${r.src}).` + low};
}

function analyze(d){
  const now = Date.now(), v = d.vids.slice().sort((a,b) => a.pub-b.pub);
  v.forEach(x => { x.age = Math.max(1, (now - x.pub)/864e5); x.short = x.dur <= 60; x.vpd = x.views / (G(x.age,x.short) * (x.age + (x.short ? TAU.s : TAU.l))); x.eng = x.views ? (x.likes + x.comments)/x.views*100 : 0; });
  const total = v.reduce((a,x)=>a+x.views,0), likes = v.reduce((a,x)=>a+x.likes,0), com = v.reduce((a,x)=>a+x.comments,0);
  const last30 = v.filter(x => x.age <= 30), last90 = v.filter(x => x.age <= 90);
  const span = Math.max(7, (now - v[0].pub)/864e5), perWeek = v.length / span * 7;
  const recentPerWeek = last30.length / 30 * 7;
  // views earned in last 30d by new uploads only (a floor on real velocity)
  const v30 = last30.reduce((a,x)=>a+x.views,0);
  const topKw = kwStats(v).slice(0,5).map(k=>k.w);
  v.forEach(x => x.seo = seoScore(x.title, topKw).score);
  // weekday + SEO insight
  const dow = Array(7).fill(0).map(()=>[]);
  const weekdayVideos = v.filter(x => x.age >= 3);
  (weekdayVideos.length ? weekdayVideos : v).forEach(x => dow[DAYS.indexOf(SINGAPORE_WEEKDAY.format(x.pub))].push(v7of(x)));
  const allV7 = v.map(v7of), priorV7 = allV7.length ? allV7.reduce((s,x)=>s+x,0)/allV7.length : 0;
  const dowAvg = dow.map(a => a.length ? (a.length/(a.length+4))*(a.reduce((x,y)=>x+y,0)/a.length) + (4/(a.length+4))*priorV7 : 0);
  const qualifiedDays = dowAvg.map((value,i)=>dow[i].length>=3?{value,i}:null).filter(Boolean);
  const bestDow = qualifiedDays.length >= 2 ? qualifiedDays.reduce((best,x)=>x.value>best.value?x:best).i : null;
  const hi = v.filter(x=>x.seo>=60), lo = v.filter(x=>x.seo<45), av = a => a.length ? a.reduce((s,x)=>s+v7of(x),0)/a.length : 0;
  const res = {v, total, likes, com, perWeek, v30, dowAvg, dowN:dow.map(a=>a.length), bestDow, hiAvg:av(hi), loAvg:av(lo), hiN:hi.length, loN:lo.length,
          shorts:v.filter(x=>x.short), longs:v.filter(x=>!x.short), topKw, kw:kwStats(v), cum:null, last90, med:median(v.map(x=>x.views))};
  buildForecast(d, res); return res;
}

function chart(id, cfg, soft){
  const canvas = $(id);
  if (!canvas) return;
  if (!window.Chart){
    chartFailure(id, new Error("Chart.js could not load. Check your connection and reload."));
    return;
  }
  const old = charts[id];
  if (soft && old && old._ty === cfg.type){
    try{
      old.data.labels = cfg.data.labels;
      if (old.data.datasets.length === cfg.data.datasets.length) cfg.data.datasets.forEach((ds, i) => Object.assign(old.data.datasets[i], ds));
      else old.data.datasets = cfg.data.datasets;
      old.update(); requestAnimationFrame(() => { if (charts[id] === old){ old.resize(); old.update("none"); } });
    } catch(error){ chartFailure(id,error); }
    return;
  }
  if (old) old.destroy();
  Object.assign(Chart.defaults,{color:"#c1d5d9",borderColor:"rgba(132,196,205,.2)"}); Chart.defaults.font.family = "Plus Jakarta Sans, system-ui, sans-serif"; Chart.defaults.font.size = 12;
  Chart.defaults.animation = {duration:1400, easing:"easeOutQuart"}; Chart.defaults.maintainAspectRatio = false;
  try{ Chart.defaults.scales.linear.border.display = false; Chart.defaults.scales.category.grid.display = false; Chart.defaults.scales.category.border.color = "rgba(84,121,224,.25)"; }catch(e){}
  Chart.defaults.elements.bar.borderRadius = 6; Chart.defaults.elements.bar.borderSkipped = false; Chart.defaults.elements.arc.borderRadius = 0;
  Object.assign(Chart.defaults.plugins.tooltip,{backgroundColor:"#02161c",borderColor:"#1b5260",borderWidth:1,padding:12,cornerRadius:7,titleColor:"#ffffff",bodyColor:"#d8edf0",boxPadding:4});
  Chart.defaults.plugins.legend.labels.usePointStyle = false; Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.plugins.legend.labels.boxHeight = 3;
  try{
    charts[id] = new Chart(canvas, cfg); charts[id]._ty = cfg.type;
    const instance = charts[id];
    requestAnimationFrame(() => { if (charts[id] === instance){ instance.resize(); instance.update("none"); } });
  } catch(error){ chartFailure(id,error); }
}
function chartFailure(id,error){
  console.error("Chart failed:", id, error);
  if (charts[id]){
    try{ charts[id].destroy(); } catch(e){}
    delete charts[id];
  }
  const canvas = $(id);
  if (!canvas) return;
  const notice = document.createElement("p");
  notice.className = "chart-unavailable";
  notice.textContent = "Chart unavailable: " + error.message;
  canvas.replaceWith(notice);
}

const ARROW = {up:"M4 12L12 4M6 4h6v6", down:"M4 4l8 8M12 6v6H6", flat:"M2.5 8h11M9.5 4l4 4-4 4"};
const arrow = (dir, text) => `<span class="tr ${dir}" role="img" aria-label="${dir === "flat" ? "about level" : dir} ${text}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ARROW[dir]}"/></svg>${text}</span>`;
// percentage change; anything within the band counts as level
function trend(now, before, band = 5, note = ""){
  if (!isFinite(now) || !isFinite(before) || !before) return "";
  const p = (now - before) / Math.abs(before) * 100, dir = p > band ? "up" : p < -band ? "down" : "flat";
  return arrow(dir, (p > 0 ? "+" : "") + (Math.abs(p) >= 10 ? p.toFixed(0) : p.toFixed(1)) + "%" + (note ? ` <em>${note}</em>` : ""));
}
const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : NaN;
const rate = list => { const v = list.reduce((s,x)=>s+x.views,0); return v ? list.reduce((s,x)=>s+x.likes+x.comments,0)/v*100 : NaN; };
const agoText = age => { const n = Math.floor(age); return n <= 1 ? "Uploaded in the last 2 days" : "Uploaded " + n + " days ago"; };
const clock = s => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");

function renderLatest(a, soft){
  const last = a.v.slice(-3).reverse(), base = a.v.slice(0,-3).filter(x=>x.age>=7).slice(-10);
  const tv = base.length >= 3 ? median(base.map(v7of)) : 0, tl = base.length >= 3 ? median(base.map(x=>x.views ? x.likes/x.views*100 : 0)) : 0, tc = base.length >= 3 ? median(base.map(x=>x.views ? x.comments/x.views*100 : 0)) : 0, te = base.length >= 3 ? median(base.map(x=>x.eng)) : 0;
  const lHTML = last.map(x => {
    const day7 = v7of(x), ratio = tv ? day7 / tv : 0;
    const dir = !tv || x.age < 7 ? "flat" : ratio > 1.1 ? "up" : ratio < .9 ? "down" : "flat";
    const word = !tv ? "Not enough history" : x.age < 7 ? "Still building" : dir === "up" ? "Above typical" : dir === "down" ? "Below typical" : "About typical";
    const top = Math.max(day7, tv, 1) * 1.08;
    const line = (label, val, now, before) => `<div class="row"><span>${label}</span><b class="num">${val}</b>${trend(now, before) || "<span></span>"}</div>`;
    const img = x.id ? `<img src="https://i.ytimg.com/vi/${encodeURIComponent(x.id)}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">` : "";
    const tag = x.id ? `a href="https://www.youtube.com/watch?v=${encodeURIComponent(x.id)}" target="_blank" rel="noopener" aria-label="Watch on YouTube"` : "div";
    return `<article class="vid"><${tag} class="thumb">${img}<b>${clock(x.dur)}</b></${x.id ? "a" : "div"}>
      <h3>${esc(x.title)}</h3><p class="when">${agoText(x.age)}</p>
      <div class="big"><span class="num">${fmt(x.views)}</span><small>views</small></div>
      <div>${arrow(dir, word + (tv && x.age >= 7 ? ", " + Math.round(ratio*100) + "% of day-7 median" : ""))}</div>
      <div class="meter ${dir}"><i style="width:${Math.min(100, day7/top*100)}%"></i>${tv ? `<s style="left:${tv/top*100}%"></s>` : ""}</div>
      <div>${line("Like rate", (x.views ? x.likes/x.views*100 : 0).toFixed(1)+"%", x.views ? x.likes/x.views*100 : 0, tl)}
      ${line("Comments", fmt(x.comments), x.views ? x.comments/x.views*100 : 0, tc)}
      ${line("Engagement", x.eng.toFixed(1)+"%", x.eng, te)}</div></article>`;
  }).join("");
  setHTML($("last3"), lHTML, soft);
}

const dhm = ms => { const t = Math.max(0, Math.floor(ms/1000)), h = Math.floor(t/3600), m = Math.floor(t%3600/60), x = t%60; return h ? h+"h "+m+"m" : m ? m+"m "+x+"s" : x+"s"; };
const dateInZone = (date, timeZone) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date).map(x=>[x.type,x.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const consecutiveDays = rows => rows.length > 0 && rows.every((row,i) => i === 0 || Date.parse(row[0]+"T00:00:00Z") - Date.parse(rows[i-1][0]+"T00:00:00Z") === 864e5);
const zonedTimeMs = (day, hour, minute, second, timeZone) => {
  const [year,month,date] = day.split("-").map(Number), target = Date.UTC(year,month-1,date,hour,minute,second);
  const format = new Intl.DateTimeFormat("en-US", {timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  let timestamp = target;
  for (let i=0;i<3;i++){
    const parts = Object.fromEntries(format.formatToParts(new Date(timestamp)).map(x=>[x.type,x.value]));
    timestamp += target - Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
  }
  return timestamp;
};
const PUBLIC_CACHE_MS = 10*60e3;
const ANALYTICS_CACHE_MS = 3*60*60e3;
const publicCacheKey = key => "ytd_public_" + encodeURIComponent(key);
function readPublicCache(key){
  if (!key) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(publicCacheKey(key)) || "null");
    if (!saved || saved.v !== 1 || !Array.isArray(saved.d?.vids) || !saved.d.vids.length) return null;
    const age = Date.now() - saved.t;
    if (!Number.isFinite(saved.t) || age < 0 || age >= PUBLIC_CACHE_MS) return null;
    const d = {...saved.d, created:new Date(saved.d.created), vids:saved.d.vids.map(x => ({...x, pub:new Date(x.pub)})), demo:false};
    if (!Number.isFinite(d.created.getTime()) || d.vids.some(x => !Number.isFinite(x.pub.getTime()))) return null;
    return {d, t:saved.t};
  } catch(e){ return null; }
}
function writePublicCache(key, d, t){
  try {
    const data = {id:d.id,name:d.name,img:d.img,created:d.created.toISOString(),subs:d.subs,views:d.views,hiddenSubs:d.hiddenSubs,
      vids:d.vids.map(x => ({id:x.id,title:x.title,pub:x.pub.toISOString(),views:x.views,likes:x.likes,comments:x.comments,dur:x.dur}))};
    localStorage.setItem(publicCacheKey(key), JSON.stringify({v:1,t,d:data}));
  } catch(e){}
}
const analyticsCacheKey = key => "ytd_analytics_" + encodeURIComponent(key);
function readAnalyticsCache(key){
  if (!key) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(analyticsCacheKey(key)) || "null"), cachedAt = saved?.cachedAt ?? saved?.t, age = Date.now() - cachedAt;
    if (!saved || saved.v !== 2 || !Array.isArray(saved.AN?.day) || !Number.isFinite(cachedAt) || age < 0 || age >= ANALYTICS_CACHE_MS) return null;
    return {AN:saved.AN,t:saved.t};
  } catch(e){ return null; }
}
function writeAnalyticsCache(key, data, t = Date.now()){
  if (!key || !data?.day) return;
  try { localStorage.setItem(analyticsCacheKey(key), JSON.stringify({v:2,t,cachedAt:Date.now(),AN:data})); } catch(e){}
}
function recordSnap(d, cached = false){
  const k = "ytd_snap_" + d.id, now = Date.now(); let a = [];
  try { a = JSON.parse(localStorage.getItem(k) || "[]"); } catch(e){}
  a = a.filter(x => now - x.t < 9*864e5);
  if (!cached){
    const rec = {t:now, v:d.views, s:d.subs};
    if (a.length && now - a[a.length-1].t < 60e3) a[a.length-1] = rec; else a.push(rec);
  }
  const out = []; for (const x of a){ if (now - x.t < 3*36e5 || !out.length || x.t - out[out.length-1].t >= 30*6e4) out.push(x); }
  if (!cached) try { localStorage.setItem(k, JSON.stringify(out)); } catch(e){}
  return out;
}
function renderKpis(d, a, soft){
  const now = Date.now(), cur = SNAP[SNAP.length-1];
  const win = (f, target) => { if (SNAP.length < 2) return null; let b = null; for (const x of SNAP) if (x.t <= target) b = x; const partial = !b; if (!b) b = SNAP[0]; return {delta:cur[f]-b[f], partial, span:cur.t-b.t, from:b.t}; };
  const t48 = win("v", now - 48*36e5), t60 = win("v", now - 36e5), td = win("s", new Date().setHours(0,0,0,0));
  let v48 = t48 ? t48.delta : null, v60 = t60 ? t60.delta : null, est60 = false; const notes = [];
  const analyticsCandidates = AN?.day?.filter(r => r[0] < dateInZone(new Date(), "America/Los_Angeles")) || [];
  const completeAnalyticsDays = analyticsCandidates.slice(-2);
  const useAn = (!t48 || t48.partial) && consecutiveDays(completeAnalyticsDays);
  let v48Label = "Views in past 48 hours";
  if (useAn){ v48 = completeAnalyticsDays.reduce((s,r) => s + (r[1]||0), 0); v48Label = "Last 2 complete Analytics days (lagged, not past 48h)"; }
  else if (t48 && t48.partial) notes.push("48h: " + dhm(t48.span) + " tracked so far");
  if (t60 && t60.partial){ est60 = true; v60 = t60.span >= 10*6e4 ? t60.delta * 36e5 / t60.span : null; }
  if (v60 == null && a.proj){ v60 = a.proj[0] / 24; est60 = true; }
  if (v48 == null && v60 == null) notes.push("Collecting data. Keep this tab open.");
  const nv = v => v == null ? "—" : fmt(Math.max(0, v));
  let tdHTML;
  if (td){ const dl = td.delta; tdHTML = arrow(dl > 0 ? "up" : dl < 0 ? "down" : "flat", (dl > 0 ? "+" : "") + fmt(dl) + " today" + (td.partial ? ` <em>since ${new Date(td.from).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</em>` : "")); }
  else if (AN && AN.day && AN.day.length){ const r = AN.day[AN.day.length-1], n = (r[5]||0) - (r[6]||0); tdHTML = arrow(n > 0 ? "up" : n < 0 ? "down" : "flat", (n > 0 ? "+" : "") + fmt(n) + " <em>latest day, from Analytics</em>"); }
  else tdHTML = '<span class="tr wait"><i class="dot busy"></i>Tracking today’s gain</span>';
  const we = weekEarn(a), etr = we.prev != null && we.usd != null ? trend(we.usd, we.prev, 5) : "";
  const earnLabel = we.real ? "earnings this week" : we.modeled ? "modeled earnings this week" : "estimated earnings this week";
  const wh = `<div class="head" title="${esc(we.note)}"><span class="num earnings">${we.modeled ? "~" : ""}${money(we.usd)}</span><span class="l">${earnLabel}</span>${etr}</div>`;
  const engAll = a.total ? (a.likes + a.com)/a.total*100 : 0;
  const r10 = a.v.slice(-10), p10 = a.v.slice(-20,-10), full = p10.length === 10;
  const up30 = a.v.filter(x => x.age <= 30).length, upPrev = a.v.filter(x => x.age > 30 && x.age <= 60).length;
  const head = (v, l, t = "") => `<div class="head"><span class="num">${v}</span><span class="l">${l}</span>${t}</div>`;
  const row = (l, v, t = "") => `<div class="row"><span>${l}</span><b class="num">${v}</b>${t}</div>`;
  const group = (name, rows) => `<div class="group"><h3>${name}</h3>${rows.join("")}</div>`;
  const note = "last 10 vs previous 10";
  const kHTML = `<div class="heads">${head(d.hiddenSubs ? "Hidden" : fmt(d.subs), "subscribers", tdHTML)}${head(Math.round(d.views).toLocaleString(), "channel views")}${wh}</div>
    <div class="ledger">${group("Audience response", [
      row(v48Label, nv(v48), notes.length ? `<span class="tr flat">${esc(notes.join(" · "))}</span>` : ""),
      row("Engagement", engAll.toFixed(1)+"%", full ? trend(rate(r10), rate(p10), 5, note) : ""),
      row("Total likes", fmt(a.likes)), row("Total comments", fmt(a.com)),
      row("Median views", fmt(a.med), full ? trend(median(r10.map(x=>x.views)), median(p10.map(x=>x.views)), 5, note) : "")])}
    ${group("Publishing", [
      row("Uploads per week", a.perWeek.toFixed(1), trend(up30, upPrev, 5, "last 30 days vs 30 before")),
      row("Videos loaded", a.v.length), row("Shorts share of videos", a.v.length ? Math.round(a.shorts.length/a.v.length*100)+"%" : "—"),
      row("Channel age", Math.round((Date.now()-d.created)/864e5/365*10)/10+" yrs")])}
    ${group("Recent reach", [
      row("Average views per video", fmt(a.total/a.v.length), full ? trend(mean(r10.map(x=>x.views)), mean(p10.map(x=>x.views)), 5, note) : ""),
      row("Views on videos published in the last 30 days", fmt(a.v30)),
      row("Uploads in the last 30 days", up30),
      row("Current daily pace", fmt(a.dailyNow))])}</div>
    <div class="legend">${arrow("up","Up")}${arrow("flat","About level")}${arrow("down","Down")}</div>`;
  setHTML($("kpis"), kHTML, soft);
}

function render(d, a, soft){
  $("cname").textContent = d.name; if (d.img && $("av").getAttribute("src") !== d.img) $("av").src = d.img;
  $("cmeta").textContent = d.demo ? "Showing sample data" : "Live from YouTube Data API";
  renderKpis(d, a, soft);
  renderLatest(a, soft);
  setHTML($("fc"), fcHTML(a), soft);
  // chart 1
  chart("c1", {type:"bar", data:{labels:a.v.map(x=>x.pub.toLocaleDateString(undefined,{month:"short",day:"numeric"})), datasets:[{data:a.v.map(x=>x.views), backgroundColor:a.v.map(x=>x.short?"#efbd6b":"#24a8ba")} ]}, options:{plugins:{legend:{display:false}}, scales:{x:{ticks:{maxTicksLimit:8}}}}}, soft);
  try{ drawC2(a, soft); } catch(error){ chartFailure("c2",error); }
  const bestDow = a.bestDow;
  const dowValues = a.dowAvg.map(x => Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0), dowMax = Math.max(1, ...dowValues);
  chart("c3", {type:"bar", data:{labels:DAYS, datasets:[{label:"Indicative day-7 views",data:dowValues,backgroundColor:DAYS.map((_,i)=>i===bestDow?"#24a8ba":"rgba(36,168,186,.5)"),borderRadius:5,minBarLength:2}]}, options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,suggestedMax:dowMax,ticks:{callback:v=>fmt(v)}}}}}, soft);
  $("best").textContent = bestDow != null ? "Best of weekdays with at least 3 uploads; estimates are indicative." : "Not enough uploads across weekdays to name a reliable best day.";
  const formatTotal = a.shorts.length + a.longs.length;
  const shortsPct = formatTotal ? Math.round(a.shorts.length/formatTotal*100) : 0;
  setHTML($("c4"), `<div class="format-ring" style="--shorts:${shortsPct}%"><div><strong>${shortsPct}%</strong><span>Shorts</span></div></div>`, soft);
  const avg = x => x.length ? fmt(x.reduce((s,v)=>s+v7of(v),0)/x.length) : "0";
  setHTML($("split"), `Shorts: ${a.shorts.length} videos, ${avg(a.shorts)} avg day-7 est.<br>Long-form: ${a.longs.length} videos, ${avg(a.longs)} avg day-7 est.`, soft);
  setHTML($("kw"), a.kw.map(k => `<span>${esc(k.w)}<b>${fmt(k.avg)} avg, used ${k.n}×</b></span>`).join(""), soft);
  $("seoinsight").textContent = a.hiN >= 30 && a.loN >= 30 ? `Titles scoring 60+ are associated with ${fmt(a.hiAvg)} estimated day-7 views (${a.hiN} videos); titles under 45 with ${fmt(a.loAvg)} (${a.loN}). Association only, not causation.` : "At least 30 videos in each score group are needed for a useful comparison.";
  const day7Median = median(a.v.filter(x=>x.age>=7).map(v7of));
  setHTML($("rows"), a.v.slice().sort((x,y)=>y.views-x.views).slice(0,40).map(x => `<tr><td>${esc(x.title)}<span class="kind" title="Duration-only format proxy; aspect ratio and per-video YouTube content type are unavailable">${x.short?"Short-form proxy":"Long-form"}</span></td><td class="r" title="Age-normalized day-7 estimate versus the loaded-video median">${fmt(x.views)}${trend(v7of(x), day7Median, 15)}</td><td class="r">${fmt(x.likes)}</td><td class="r">${fmt(x.comments)}</td><td class="r">${x.eng.toFixed(1)}%</td><td class="r">${fmt(x.vpd)}</td><td class="r"><span class="seo ${cls(x.seo)}">${x.seo}</span></td></tr>`).join(""), soft);
  draftScore();
}

function drawC2(a, soft){
  let run = 0; const cum = a.v.map(x => (run += Number.isFinite(x.views) ? Math.max(0,x.views) : 0)), lbl = a.v.map(x => x.pub.toLocaleDateString(undefined,{month:"short",day:"numeric"}));
  const fl = [], fv = []; let acc = 0;
  for (let i = 1; i <= 6; i++){ fl.push(new Date(Date.now()+i*5*864e5).toLocaleDateString(undefined,{month:"short",day:"numeric"})); for (let k = (i-1)*5; k < i*5; k++) acc += Number.isFinite(a.proj[k]) ? Math.max(0,a.proj[k]) : 0; fv.push(Math.round(run + acc)); }
  const yMax = Math.max(1, ...cum, ...fv);
  chart("c2", {type:"line", data:{labels:[...lbl,...fl], datasets:[{label:"Cumulative views",data:cum,borderColor:"#24a8ba",backgroundColor:"rgba(36,168,186,.14)",fill:true,borderWidth:2,pointRadius:0,tension:.3},{label:"Forecast",data:[...Array(cum.length-1).fill(null),run,...fv],borderColor:"#efbd6b",borderDash:[6,5],pointRadius:0}]}, options:{scales:{x:{ticks:{maxTicksLimit:8}},y:{beginAtZero:true,suggestedMax:yMax,ticks:{callback:v=>fmt(v)}}}}}, soft);
}
function fcHTML(a){
  const cal = a.cal || {src:"model"}, kind = a.nextShort ? "Short" : "video";
  const src = cal.src === "analytics" ? "Scale-adjusted to recent Analytics views; not backtested" : cal.src === "tracked" ? "Scale-adjusted to " + dhm(cal.span) + " of tracked views; not backtested" : "Model only. Connect Analytics for a tighter forecast";
  const rate = a.subsPerDay < 1 ? a.subsPerDay.toFixed(2) : a.subsPerDay.toFixed(1);
  const nextKind = a.nextPooled ? `${kind} (mixed-format proxy)` : kind;
  const nextRange = a.nextNEff >= 3 ? `${a.nextPooled ? "Pooled historical" : "Historical"} 10th–90th percentile: ${fmt(a.nextLo)} to ${fmt(a.nextHi)}; indicative only` : "Too little comparable history for a reliable range";
  const change30 = Math.max(-a.subsCurrent, a.subsPerDay*30), changeLabel = a.subsHidden ? "—" : (change30 > 0 ? "+" : "") + fmt(change30);
  const milestone = a.subsHidden ? "—" : a.eta ? spanText(a.eta) : "n/a";
  const milestoneNote = a.subsHidden ? "Subscriber count is hidden" : a.eta ? "Assumes the current pace holds" : a.subsPerDay <= 0 ? "Not reachable at the current net growth rate" : "Not enough data";
  return `
    <div><div class="num">${a.nextN ? fmt(a.nextViews) : "—"}</div><span>Expected views on your next ${nextKind} after 7 days<em>${nextRange}</em></span></div>
    <div><div class="num">${fmt(a.forecast30)}</div><span>Indicative views in the next 30 days<em>Indicative range ${fmt(a.f30lo)} to ${fmt(a.f30hi)}; fixed multipliers, not backtested. ${src}</em></span></div>
    <div><div class="num">${changeLabel}</div><span>Projected net subscriber change in 30 days<em>${a.subsHidden ? "Hidden subscriber count; forecast unavailable" : a.real ? "Blends your real 90-day growth with the view forecast" : "Estimated from the view forecast and your subscribers per view"}</em></span></div>
    <div><div class="num">${milestone}</div><span>To reach ${a.subsHidden ? "—" : fmt(a.ms)} subscribers at ${rate}/day<em>${milestoneNote}</em></span></div>
    <div><div class="num">${a.bestDow == null ? "—" : DAYS[a.bestDow]}</div><span>Indicative best weekday at day 7</span></div>`;
}

function draftScore(){
  const t = $("draft").value.trim(); if (!t){ $("dscore").innerHTML = '<span class="sub">Your score and tips appear here.</span>'; return; }
  const r = seoScore(t, D ? D.topKw : []);
  $("dscore").innerHTML = `<div class="num ${cls(r.score)}" style="font-size:44px">${r.score}<span style="font-size:20px;color:var(--mut)"> / 100</span></div><div class="bar"><i style="width:${r.score}%"></i></div><span class="sub">${t.length} characters</span>` + (r.tips.length ? `<ul class="tips">${r.tips.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>` : '<p class="sub">Strong title. No changes suggested.</p>');
}

/* ===== Analytics API (OAuth) ===== */
let TOKEN = null, AN = null;
const SCOPE = () => "https://www.googleapis.com/auth/yt-analytics.readonly" + (CONFIG.REVENUE ? " https://www.googleapis.com/auth/yt-analytics-monetary.readonly" : "");
function connectAnalytics(){
  if (CONFIG.ACCESS_TOKEN && !TOKEN) TOKEN = CONFIG.ACCESS_TOKEN;
  if (TOKEN){ loadAnalytics(); return; }
  if (location.protocol === "file:"){ openTok(); return; }
  if (!CONFIG.OAUTH_CLIENT_ID){ openGuide(); return; }
  const go = () => google.accounts.oauth2.initTokenClient({client_id:CONFIG.OAUTH_CLIENT_ID, scope:SCOPE(), callback:r => {
    if (r.error){ $("msg").innerHTML = `<p class="err">Sign-in failed: ${esc(r.error)}. Check your authorized JavaScript origin and test user.</p>`; return; }
    TOKEN = r.access_token; loadAnalytics(); }}).requestAccessToken();
  if (window.google && google.accounts) go();
  else { const sc = document.createElement("script"); sc.src = "https://accounts.google.com/gsi/client"; sc.onload = go; sc.onerror = () => { $("msg").innerHTML = '<p class="err">Could not load Google sign-in. Check your connection.</p>'; }; document.head.appendChild(sc); }
}

/* ===== Paste-token connect (works from file://) ===== */
function openTok(){ openGuide(); const f=$("f_tok"); if (f){ f.scrollIntoView({block:"center"}); f.focus(); } }
function parseToken(raw){
  raw = (raw || "").trim();
  const m = raw.match(/access_token=([^&\s#]+)/);
  return m ? decodeURIComponent(m[1]) : raw.replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
}
// If a redirect lands here with #access_token=..., use it and clean the address bar
(function(){
  const t = parseToken(location.hash.indexOf("access_token=") >= 0 ? location.hash : "");
  if (t.length >= 20){ TOKEN = t; try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){} window.addEventListener("load", () => loadAnalytics()); }
})();
async function ar(p){
  const maxResults = Math.min(200, Math.max(1, Number(p.maxResults) || 200));
  let startIndex = Number(p.startIndex) || 1, rows = [];
  for (let page = 0; page < 100; page++){
    const r = await fetch("https://youtubeanalytics.googleapis.com/v2/reports?" + new URLSearchParams({ids:"channel==" + (D && D.id ? D.id : "MINE"), ...p, maxResults, startIndex}), {headers:{Authorization:"Bearer " + TOKEN}});
    const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || "Analytics error " + r.status);
    const batch = j.rows || []; rows.push(...batch);
    if (batch.length < maxResults) return rows;
    startIndex += batch.length;
  }
  return rows;
}
async function loadAnalytics(quiet, force = false){
  const cacheKey = D && D.id || CONFIG.CHANNEL_ID || CONFIG.HANDLE;
  if (!force && !AN){
    const cached = readAnalyticsCache(cacheKey);
    if (cached){ AN = cached.AN; lastAnSlot = slotOf(Date.now(), CONFIG.ANALYTICS_MS); learnRpm(AN.day, AN.rev); renderAnalytics(); return; }
  }
  lastAnSlot = slotOf(Date.now(), CONFIG.ANALYTICS_MS);
  if (CH[cur]) CH[cur].token = TOKEN;
  try {
    const iso = d => d.toISOString().slice(0,10), b = {startDate:iso(new Date(Date.now()-90*864e5)), endDate:iso(new Date())};
        const [day, traffic, geo, vid, device, deviceMore, geoMore, trafficMore, dayMore, audience, cards, annotations, vidMore, playlist, rev, revMore] = await Promise.all([
          ar({...b, dimensions:"day", metrics:"views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,shares,likes,comments", sort:"day"}),
      ar({...b, dimensions:"insightTrafficSourceType", metrics:"views,estimatedMinutesWatched", sort:"-views"}),
      ar({...b, dimensions:"country", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:200}),
          ar({...b, dimensions:"video", metrics:"views,averageViewPercentage,subscribersGained", sort:"-views", maxResults:200}),
          ar({...b, dimensions:"deviceType", metrics:"views,estimatedMinutesWatched", sort:"-views"}).catch(() => []),
          ar({...b, dimensions:"deviceType", metrics:"views,averageViewDuration,averageViewPercentage,likes,comments,shares", sort:"-views"}).catch(() => null),
          ar({...b, dimensions:"country", metrics:"views,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares,dislikes,uniques", sort:"-views", maxResults:200}).catch(() => null),
          ar({...b, dimensions:"insightTrafficSourceType", metrics:"views,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares", sort:"-views"}).catch(() => null),
          ar({...b, dimensions:"day", metrics:"engagedViews,dislikes,videosAddedToPlaylists,videosRemovedFromPlaylists", sort:"day"}).catch(() => null),
          ar({...b, dimensions:"day", metrics:"uniques,redViews,estimatedRedMinutesWatched", sort:"day"}).catch(() => null),
          ar({...b, dimensions:"day", metrics:"cardImpressions,cardClicks,cardClickRate,cardTeaserImpressions,cardTeaserClicks,cardTeaserClickRate", sort:"day"}).catch(() => null),
          ar({...b, dimensions:"day", metrics:"annotationImpressions,annotationClickableImpressions,annotationClicks,annotationCloses,annotationClosableImpressions,annotationClickThroughRate,annotationCloseRate", sort:"day"}).catch(() => null),
              ar({...b, dimensions:"video", metrics:"views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,comments,shares,subscribersLost,uniques,engagedViews", sort:"-views", maxResults:200}).catch(() => null),
              ar({...b, dimensions:"playlist", metrics:"views,playlistEstimatedMinutesWatched,playlistStarts,playlistSaves,playlistAverageViewDuration", sort:"-views", maxResults:200}).catch(() => null),
          CONFIG.REVENUE ? ar({...b, dimensions:"day", metrics:"estimatedRevenue", sort:"day"}).catch(() => null) : Promise.resolve(null),
          CONFIG.REVENUE ? ar({...b, dimensions:"day", metrics:"estimatedAdRevenue,grossRevenue,estimatedRedPartnerRevenue,monetizedPlaybacks,adImpressions,playbackBasedCpm,cpm", sort:"day"}).catch(() => null) : Promise.resolve(null)]);
            const optional = p => ar({...b, ...p}).catch(e => { console.warn("optional report unavailable", p.dimensions, e.message); return []; });
            const extraPairs = await Promise.all([
          ["operatingSystem", {dimensions:"operatingSystem", metrics:"views,estimatedMinutesWatched,averageViewDuration", sort:"-views", maxResults:200}],
          ["demographics", {dimensions:"ageGroup,gender", metrics:"viewerPercentage", maxResults:200}],
          ["provinces", {dimensions:"province", metrics:"views,estimatedMinutesWatched", filters:"country==US", sort:"-views", maxResults:200}],
          ["playbackLocations", {dimensions:"insightPlaybackLocationType", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:200}],
          ["playbackLocationDetails", {dimensions:"insightPlaybackLocationDetail", metrics:"views,estimatedMinutesWatched", filters:"insightPlaybackLocationType==EMBEDDED", sort:"-views", maxResults:200}],
          ["sharingService", {dimensions:"sharingService", metrics:"shares", sort:"-shares", maxResults:200}],
          ["subscribedStatus", {dimensions:"subscribedStatus", metrics:"views,estimatedMinutesWatched,subscribersGained,subscribersLost", sort:"-views", maxResults:200}],
          ["creatorContentType", {dimensions:"creatorContentType", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:200}],
          ["liveOrOnDemand", {dimensions:"liveOrOnDemand", metrics:"views,estimatedMinutesWatched,averageViewDuration", sort:"-views", maxResults:200}],
          ["cardTypes", {dimensions:"cardType", metrics:"cardImpressions,cardClicks,cardClickRate", sort:"-cardImpressions", maxResults:200}],
          ["annotationTypes", {dimensions:"annotationType", metrics:"annotationImpressions,annotationClicks,annotationClickThroughRate,annotationCloses,annotationCloseRate", sort:"-annotationImpressions", maxResults:200}],
          ["membershipCancellations", {dimensions:"membershipsCancellationSurveyReason", metrics:"membershipsCancellationSurveyResponses", maxResults:200}],
          ["adType", {dimensions:"adType", metrics:"estimatedRevenue,estimatedAdRevenue,grossRevenue,estimatedRedPartnerRevenue,monetizedPlaybacks,adImpressions,playbackBasedCpm,cpm", sort:"-estimatedRevenue", maxResults:200}]
            ].map(async ([name, params]) => [name, await optional(params)]));
            const trafficDetails = await Promise.all(traffic.slice(0, 12).map(async row => ({source:row[0], rows:await optional({dimensions:"insightTrafficSourceDetail", metrics:"views,estimatedMinutesWatched", filters:"insightTrafficSourceType==" + row[0], sort:"-views", maxResults:200})})));
            const retention = await Promise.all(vid.slice(0, 10).map(async row => ({videoId:row[0], rows:await optional({dimensions:"elapsedVideoTimeRatio", metrics:"audienceWatchRatio,relativeRetentionPerformance", filters:"video==" + row[0], sort:"elapsedVideoTimeRatio", maxResults:200})})));
            const extra = {...Object.fromEntries(extraPairs), trafficDetails, retention};
            AN = {day, traffic, geo, vid, device, deviceMore, geoMore, trafficMore, dayMore, audience, cards, annotations, vidMore, playlist, rev, revMore, extra};
    writeAnalyticsCache(cacheKey, AN); learnRpm(day, rev); renderAnalytics(); { const w = $("msg").querySelector(".anw"); if (w) w.remove(); }
  } catch (e) {
    if (quiet && AN){ if (!$("msg").querySelector(".anw")) $("msg").insertAdjacentHTML("beforeend", '<p class="anw">Analytics could not refresh (the token has most likely expired), so the last Analytics data is still shown. <button onclick="openTok()">Paste a new token</button></p>'); return; }
    if (e instanceof TypeError){
      $("msg").innerHTML = `<p class="err">The browser could not reach Google Analytics at all (${esc(e.message)}), so this is not a sign-in or token problem. Usual causes: an ad blocker or privacy shield blocking youtubeanalytics.googleapis.com, no internet, or opening the file straight from disk. Try a private window with extensions off, or open it from http://localhost:8000. Press F12 and look at the Console and Network tabs to see which request was blocked.</p>`; return;
    }
    $("msg").innerHTML = `<p class="err">Analytics failed: ${esc(e.message)} If you pasted a token it may have expired (they last about an hour). Otherwise check that the YouTube Analytics API is enabled and that you signed in with the channel owner's account. <button onclick="openTok()">Paste a new token</button></p>`;
  }
}
/* ===== Analytics from the public snapshot (no login or password needed) ===== */
function applySnapshot(s, id){
  AN = s.AN; writeAnalyticsCache(id, AN, s.t); learnRpm(AN.day, AN.rev); renderAnalytics();
  const sb = document.querySelector("#an .sub"); if (sb) sb.textContent = "Public YouTube Analytics report, last 90 days, updated " + hhmm(s.t) + ".";
}
async function loadSnapshot(quiet, force = false, deferApply = false){
  if (!deferApply) lastAnSlot = slotOf(Date.now(), CONFIG.ANALYTICS_MS);
  const id = CONFIG.CHANNEL_ID || (D && D.id);
  if (!id){ if (!quiet) $("snap_status").textContent = "Shared Analytics is unavailable for this channel."; return; }
  if (!force){
    const cached = readAnalyticsCache(id);
    if (cached){ if (deferApply) return cached; applySnapshot(cached, id); return; }
  }
  let j;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetch("data/analytics-" + id + ".json?t=" + Date.now(), {cache:"no-store",signal:controller.signal});
    if (!r.ok) throw new Error("report not found");
    j = await r.json();
    if (!j || !j.AN) throw new Error("invalid report");
  } catch(e){
    if (!quiet) $("snap_status").textContent = e.name === "AbortError" ? "The Analytics report timed out while loading. Try Refresh again." : "The shared report is not published yet. The dashboard owner needs to configure and run the Analytics publishing workflow.";
    return;
  } finally { clearTimeout(timeout); }
  if (deferApply) return {AN:j.AN,t:j.t};
  applySnapshot(j, id);
}
const displayLabel = value => {
  const text = String(value ?? "");
  const known = {
    ADVERTISING:"Advertising", CAMPAIGN_CARD:"Campaign cards", END_SCREEN:"End screens",
    EXT_URL:"External", HASHTAGS:"Hashtags", LIVE_REDIRECT:"Live redirects",
    NO_LINK_OTHER:"Other YouTube features", NOTIFICATION:"Notifications", PLAYLIST:"Playlists",
    PRODUCT_PAGE:"Product pages", PROMOTED:"Promoted", RELATED_VIDEO:"Related videos",
    SOUND_PAGE:"Sound pages", SUBSCRIBER:"Subscribers", YT_CHANNEL:"YouTube channel",
    YT_OTHER_PAGE:"Other YouTube pages", YT_SEARCH:"YouTube Search", SMART_TV:"Smart TV",
    MACINTOSH:"Mac", IOS:"iOS", ANDROID:"Android", WEBOS:"webOS", TV:"TV", US:"United States"
  };
  if (known[text]) return known[text];
  if (!/^[A-Z0-9_]+$/.test(text)) return text;
  return text.replace(/_/g," ").toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
};
const countryName = code => {
  try { return new Intl.DisplayNames([navigator.language || "en"], {type:"region"}).of(code) || code; }
  catch(e) { return code; }
};

function renderExtraReports(extra){
  const defs = [
    ["operatingSystem","Operating systems",["Operating system","Views","Watch minutes","Average duration (sec)"]],
    ["demographics","Viewer demographics",["Age group","Gender","Viewer share (API value)"]],
    ["provinces","US state and province views",["State / province","Views","Watch minutes"]],
    ["playbackLocations","Playback locations",["Location","Views","Watch minutes"]],
    ["playbackLocationDetails","Embedded playback details",["Detail","Views","Watch minutes"]],
    ["sharingService","Shares by service",["Service","Shares"]],
    ["subscribedStatus","Subscribed vs unsubscribed viewers",["Viewer status","Views","Watch minutes","Subscribers gained","Subscribers lost"]],
    ["creatorContentType","Content type",["Content type","Views","Watch minutes"]],
    ["liveOrOnDemand","Live vs on-demand playback",["Playback type","Views","Watch minutes","Average duration (sec)"]],
    ["cardTypes","Card performance by type",["Card type","Impressions","Clicks","Click rate"]],
    ["annotationTypes","Annotation performance by type",["Annotation type","Impressions","Clicks","Click-through rate","Closes","Close rate"]],
    ["membershipCancellations","Membership cancellation reasons",["Reason","Responses"]],
    ["adType","Ad performance by ad type",["Ad type","Estimated revenue","Ad revenue","Gross revenue","Premium revenue","Monetized playbacks","Ad impressions","Playback-based CPM","CPM"]]
  ];
  const numberCell = (value, column) => {
    if (value == null) return "—";
    if (typeof value !== "number") return esc(String(value));
    if (/revenue|\bcpm\b/i.test(column)) return "$" + value.toFixed(2);
    if (/ratio|share \(api value\)/i.test(column)) return value.toFixed(3);
    return fmt(value);
  };
  const table = (title, columns, rows) => `<details class="an-report"><summary>${esc(title)}</summary><div class="wrap"><table><thead><tr>${columns.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map(row=>`<tr>${columns.map((col,i)=>`<td>${i===0?esc(displayLabel(row[i])):numberCell(row[i],col)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">No rows returned. YouTube may omit reports for privacy, eligibility, or compatibility reasons.</td></tr>`}</tbody></table></div></details>`;
  if (!extra){ setHTML($("extraReports"), '<p class="sub">This Analytics snapshot predates the expanded reports. Run the publishing workflow to regenerate it.</p>', false); return; }
  const reports = Object.fromEntries(defs.map(([key,title,columns]) => [key, table(title, columns, extra[key] || [])]));
  const trafficRows = (extra.trafficDetails || []).flatMap(report => (report.rows || []).map(row=>[report.source,...row]));
  reports.trafficDetails = table("Traffic source details",["Source","Detail","Views","Watch minutes"],trafficRows);
  const retained = (extra.retention || []).flatMap(report => (report.rows || []).map(row=>[D.v.find(v=>v.id===report.videoId)?.title || report.videoId,...row]));
  reports.retention = table("Audience retention for top 10 videos",["Video","Elapsed video ratio","Audience watch ratio","Relative retention performance"],retained);
  const group = (title, keys) => `<details class="an-group"><summary>${title}<span>${keys.length} reports</span></summary><div class="an-report-grid">${keys.map(key=>reports[key]).join("")}</div></details>`;
  setHTML($("extraReports"), [
    group("Audience",["demographics","provinces","subscribedStatus"]),
    group("Discovery and playback",["operatingSystem","playbackLocations","playbackLocationDetails","liveOrOnDemand","trafficDetails"]),
    group("Engagement",["sharingService","cardTypes","annotationTypes","retention"]),
    group("Monetization",["membershipCancellations","adType"])
  ].join(""), ANR);
}
function renderAnalytics(){
  const soft = ANR; ANR = true;
  $("apitch").style.display = "none"; $("abody").style.display = "block"; // show first so charts get a real size
  const range = Number($("anRange")?.value) || 90, daily = AN.day || [];
  const rangeEnd = daily.length ? daily[daily.length-1][0] : new Date().toISOString().slice(0,10);
  const rangeStartDate = new Date(rangeEnd + "T00:00:00Z"); rangeStartDate.setUTCDate(rangeStartDate.getUTCDate() - range + 1);
  const rangeStart = rangeStartDate.toISOString().slice(0,10);
  const withinRange = rows => (rows || []).filter(row => row[0] >= rangeStart && row[0] <= rangeEnd);
  const d = withinRange(daily), dayMore = withinRange(AN.dayMore), audience = withinRange(AN.audience), cards = withinRange(AN.cards), annotations = withinRange(AN.annotations);
  $("anTitle").textContent = `Analytics: last ${range} available days`;
  $("anWindow").textContent = d.length ? `Daily metrics: ${d[0][0]} to ${d[d.length-1][0]}. Breakdown reports below cover 90 days.` : "No daily Analytics rows in this period. Breakdown reports below cover 90 days.";
  const sum = i => d.reduce((a,r) => a + (r[i]||0), 0), views = sum(1), mins = sum(2), net = sum(5) - sum(6), likes = sum(8), comments = sum(9);
  const engagement = views ? (likes + comments) / views * 100 : 0, subsPerThousand = views ? net / views * 1000 : 0;
  const wAvg = i => views ? d.reduce((a,r) => a + r[i]*r[1], 0)/views : 0, ad = views ? mins*60/views : 0, ap = wAvg(4);
  const h = Math.floor(d.length/2), A = d.slice(-h), B = d.slice(-2*h,-h);
  const tot = (r, f) => r.reduce((s,x)=>s+f(x),0), w = (r, i) => tot(r, x=>x[i]*x[1]) / tot(r, x=>x[1]);
  const duration = rows => { const rowViews = tot(rows,x=>x[1]); return rowViews ? tot(rows,x=>x[2])*60/rowViews : 0; };
  const cmp = f => h ? trend(f(A), f(B), 5, `last ${h} days vs ${h} before`) : "";
  const sumRows = (rows, i) => rows ? rows.reduce((s,r)=>s+(r[i]||0),0) : 0;
  const weighted = (rows, value, weight) => { const n=sumRows(rows,weight); return n ? rows.reduce((s,r)=>s+(r[value]||0)*(r[weight]||0),0)/n : 0; };
  const K = [[fmt(views),"Views",cmp(r=>tot(r,x=>x[1]))],[fmt(mins/60),"Watch hours",cmp(r=>tot(r,x=>x[2]))],[Math.floor(ad/60)+"m "+Math.round(ad%60)+"s","Average view duration",cmp(duration)],[ap.toFixed(0)+"%","Average share of video watched",cmp(r=>w(r,4))],[(net>=0?"+":"")+fmt(net),"Net subscribers",cmp(r=>tot(r,x=>x[5]-x[6]))],[fmt(sum(7)),"Shares",cmp(r=>tot(r,x=>x[7]))],[fmt(comments),"Comments",cmp(r=>tot(r,x=>x[9]||0))],[engagement.toFixed(2)+"%","Likes + comments / views",cmp(r=>{const v=tot(r,x=>x[1]);return v?tot(r,x=>(x[8]||0)+(x[9]||0))/v*100:0;})],[subsPerThousand.toFixed(2),"Net subs / 1K views",cmp(r=>{const v=tot(r,x=>x[1]);return v?tot(r,x=>(x[5]||0)-(x[6]||0))/v*1000:0;})]];
  if (dayMore.length) K.push([fmt(sumRows(dayMore,1)),"Engaged views",""],[fmt(sumRows(dayMore,2)),"Dislikes",""],[fmt(sumRows(dayMore,3)),"Videos added to playlists",""],[fmt(sumRows(dayMore,4)),"Videos removed from playlists",""]);
  if (audience.length) K.push([fmt(sumRows(audience,1)/audience.length),"Average daily unique viewers",""],[fmt(sumRows(audience,2)),"YouTube Premium views",""],[fmt(sumRows(audience,3)/60),"Premium watch hours",""]);
  if (cards.length){ const imp=sumRows(cards,1), clicks=sumRows(cards,2), teaserImp=sumRows(cards,4), teaserClicks=sumRows(cards,5); K.push([fmt(imp),"Card impressions",""],[fmt(imp?clicks/imp*100:0)+"%","Card click-through rate",""],[fmt(teaserImp),"Card teaser impressions",""],[fmt(teaserImp?teaserClicks/teaserImp*100:0)+"%","Card teaser click rate",""]); }
  if (annotations.length){ const imp=sumRows(annotations,1), clickable=sumRows(annotations,2), clicks=sumRows(annotations,3), closes=sumRows(annotations,4), closable=sumRows(annotations,5); K.push([fmt(imp),"Annotation impressions",""],[fmt(clickable?clicks/clickable*100:0)+"%","Annotation click-through rate",""],[fmt(closable?closes/closable*100:0)+"%","Annotation close rate",""]); }
  const rv = withinRange(AN.rev), rt = r => r.reduce((s,x) => s + (x[1]||0), 0);
  if (rv?.length){ K.push(["$"+rt(rv).toFixed(2), "Estimated earnings", h ? trend(rt(rv.slice(-h)), rt(rv.slice(-2*h,-h)), 5, `last ${h} days vs ${h} before`) : ""]); }
  else { const ss = shortShare(D, 0, 90); K.push(["~"+money(estEarn(d, ss)), "Estimated earnings (modeled)", h ? trend(estEarn(A, ss), estEarn(B, ss), 5, `last ${h} days vs ${h} before`) : ""]); }
  K.push([fmt(sum(8)), "Likes", cmp(r=>tot(r,x=>x[8]||0))]);
  const revMore = withinRange(AN.revMore);
  if (revMore.length) K.push([money(sumRows(revMore,1)),"Estimated ad revenue",""],[money(sumRows(revMore,2)),"Gross revenue",""],[money(sumRows(revMore,3)),"YouTube Premium revenue",""],[fmt(sumRows(revMore,4)),"Monetized playbacks",""],[fmt(sumRows(revMore,5)),"Ad impressions",""],["$"+weighted(revMore,6,4).toFixed(2),"Playback-based CPM",""],["$"+weighted(revMore,7,5).toFixed(2),"CPM",""]);
  setHTML($("akpis"), K.map(k => `<div><span class="num${/earnings/i.test(k[1]) ? " earnings" : ""}">${k[0]}</span><span class="l">${k[1]}</span>${k[2]}</div>`).join(""), soft);
  chart("c5", {type:"bar", data:{labels:d.map(r=>r[0].slice(5)), datasets:[{type:"line",label:"Views",data:d.map(r=>r[1]),borderColor:"#24a8ba",borderWidth:2,pointRadius:0,tension:.25,yAxisID:"y"},{label:"Net subscribers",data:d.map(r=>r[5]-r[6]),backgroundColor:"rgba(239,189,107,.78)",yAxisID:"y1"}]}, options:{scales:{x:{ticks:{maxTicksLimit:8}},y:{position:"left"},y1:{position:"right",grid:{drawOnChartArea:false}}}}}, soft);
  chart("c6", {type:"bar", data:{labels:AN.traffic.map(r=>displayLabel(r[0])), datasets:[{data:AN.traffic.map(r=>r[1]),backgroundColor:"#24a8ba"}]}, options:{indexAxis:"y",plugins:{legend:{display:false}}}}, soft);
  const avgDuration = (row, more) => more && more[2] != null ? more[2] : row[1] ? row[2]*60/row[1] : null;
  const durationText = seconds => seconds == null ? "—" : clock(Math.round(seconds));
  const geoMore = new Map((AN.geoMore || []).map(r=>[r[0],r]));
  setHTML($("geo"), AN.geo.map(r => { const e=geoMore.get(r[0]); return `<tr><td>${esc(countryName(r[0]))}</td><td class="r">${fmt(r[1])}</td><td class="r">${fmt(r[2]/60)}</td><td class="r">${durationText(avgDuration(r,e))}</td><td class="r">${e&&e[3]!=null?e[3].toFixed(1)+"%":"—"}</td><td class="r">${e&&e[4]!=null?fmt(e[4]):"—"}</td><td class="r">${e&&e[5]!=null?fmt(e[5]+(e[6]||0)):"—"}</td><td class="r">${e&&e[7]!=null?fmt(e[7]):"—"}</td></tr>`; }).join(""), soft);
  const trafficMore = new Map((AN.trafficMore || []).map(r=>[r[0],r]));
  setHTML($("trafficRows"), AN.traffic.map(r => { const e=trafficMore.get(r[0]); return `<tr><td>${esc(displayLabel(r[0]))}</td><td class="r">${fmt(r[1])}</td><td class="r">${fmt(r[2]/60)}</td><td class="r">${durationText(avgDuration(r,e))}</td><td class="r">${e&&e[3]!=null?e[3].toFixed(1)+"%":"—"}</td><td class="r">${e&&e[4]!=null?fmt(e[4]):"—"}</td><td class="r">${e&&e[5]!=null?fmt(e[5]+(e[6]||0)):"—"}</td><td class="r">${e&&e[7]!=null?fmt(e[7]):"—"}</td></tr>`; }).join(""), soft);
  const device = AN.device || [];
  const deviceMore = new Map((AN.deviceMore || []).map(r=>[r[0],r]));
  setHTML($("devices"), device.map(r => { const e=deviceMore.get(r[0]); return `<tr><td>${esc(r[0].replace(/_/g," ").toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()))}</td><td class="r">${fmt(r[1])}</td><td class="r">${fmt(r[2]/60)}</td><td class="r">${durationText(avgDuration(r,e))}</td><td class="r">${e&&e[3]!=null?e[3].toFixed(1)+"%":"—"}</td><td class="r">${e&&e[1]&&e[4]!=null&&e[5]!=null?((e[4]+e[5])/e[1]*100).toFixed(2)+"%":"—"}</td><td class="r">${e&&e[6]!=null?fmt(e[6]):"—"}</td></tr>`; }).join(""), soft);
  const vidMore = new Map((AN.vidMore || []).map(r=>[r[0],r]));
  setHTML($("ret"), AN.vid.map(r => { const v=D.v.find(x=>x.id===r[0]), e=vidMore.get(r[0]); return `<tr><td>${esc(v?v.title:r[0])}</td><td class="r">${fmt(r[1])}</td><td class="r">${r[2].toFixed(0)}%</td><td class="r">${fmt(r[3])}</td><td class="r">${e&&e[2]!=null?fmt(e[2]/60):"—"}</td><td class="r">${e&&e[3]!=null?clock(Math.round(e[3])):"—"}</td><td class="r">${e&&e[4]!=null?fmt(e[4]):"—"}</td><td class="r">${e&&e[6]!=null?fmt(e[6]):"—"}</td><td class="r">${e&&e[7]!=null?fmt(e[7]):"—"}</td><td class="r">${e&&e[5]!=null?fmt(e[5]):"—"}</td><td class="r">${e&&e[8]!=null?fmt(e[8]):"—"}</td><td class="r">${e&&e[9]!=null?fmt(e[9]):"—"}</td><td class="r">${e&&e[10]!=null?fmt(e[10]):"—"}</td></tr>`; }).join(""), soft);
  const playlists = AN.playlist || [];
  setHTML($("playlists"), playlists.map(r=>`<tr><td>${esc(r[0])}</td><td class="r">${fmt(r[1])}</td><td class="r">${fmt(r[2]/60)}</td><td class="r">${fmt(r[3])}</td><td class="r">${fmt(r[4])}</td><td class="r">${clock(Math.round(r[5]))}</td></tr>`).join(""), soft);
  renderExtraReports(AN.extra);
  requestAnimationFrame(() => Object.values(charts).forEach(c => c.resize()));
  // rebuild the forecast with the real data
  if (CUR && D){ buildForecast(CUR, D); setHTML($("fc"), fcHTML(D), true); drawC2(D, true); renderKpis(CUR, D, true); }
}

function renderSupplemental(data){
  const root = $("supplementalBody");
  if (!root) return;
  const videos = data.videos || {}, ids = Object.keys(videos);
  const titles = new Map((D?.v || []).map(video=>[video.id,video.title]));
  const link = id => /^[\w-]{11}$/.test(id || "") ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener">${esc(titles.get(id) || id)}</a>` : esc(id);
  const heatmapHTML = points => {
    if (!Array.isArray(points) || !points.length) return '<p class="sub">No Most Replayed heatmap available.</p>';
    const maxTime=Math.max(1,...points.map(point=>Number(point.endTime)||0));
    return `<div class="supp-heatmap" role="img" aria-label="Most Replayed engagement heatmap">${points.map(point=>{
      const start=Math.max(0,Number(point.startTime)||0), end=Math.max(start,Number(point.endTime)||start), level=Math.max(0,Math.min(1,Number(point.intensity)||0));
      return `<i title="${Math.round(start)}–${Math.round(end)} sec" style="left:${start/maxTime*100}%;width:${Math.max(.5,(end-start)/maxTime*100)}%;opacity:${.2+level*.8}"></i>`;
    }).join("")}</div>`;
  };
  const videoBlocks=ids.map(id=>{
    const signal=videos[id] || {}, dislike=signal.returnYouTubeDislike, extra=signal.ytDlp || {};
    const tags=Array.isArray(extra.tags) ? extra.tags : [], captions=Array.isArray(extra.captions) ? extra.captions : [];
    const dislikeHTML=dislike ? `<p>Estimated dislikes: <b>${dislike.dislikes==null?"—":fmt(dislike.dislikes)}</b> <span>Rating ${dislike.rating==null?"—":dislike.rating.toFixed(3)} · Official like/dislike ratio ${dislike.likeToDislikeRatio==null?"—":dislike.likeToDislikeRatio.toFixed(2)+":1"}</span></p>` : '<p class="sub">No Return YouTube Dislike estimate available.</p>';
    const tagsHTML=tags.length ? `<div class="supp-tags">${tags.map(tag=>`<span>${esc(tag)}</span>`).join("")}</div>` : '<p class="sub">No hidden tags returned.</p>';
    const captionsHTML=captions.length ? captions.map(track=>`<details class="supp-caption"><summary>${esc(track.language || "Unknown language")} · ${track.type==="automatic"?"Auto-generated":"Manual"}</summary><pre>${esc(track.text || "")}</pre></details>`).join("") : '<p class="sub">No English captions available.</p>';
    return `<details class="an-report supp-video"><summary>${link(id)}</summary><div class="supp-video-content"><h4>Return YouTube Dislike</h4>${dislikeHTML}<h4>Hidden tags</h4>${tagsHTML}<h4>Most Replayed</h4>${heatmapHTML(extra.heatmap)}<h4>Captions</h4>${captionsHTML}</div></details>`;
  }).join("");
  const invidious=data.invidious || {}, trending=invidious.trending || {}, recommendations=invidious.recommendations || {};
  const trendingHTML=Object.entries(trending).map(([region,items])=>`<details class="supp-list"><summary>${esc(region)} trending</summary><ol>${(items || []).map(id=>`<li>${link(id)}</li>`).join("") || "<li>No results.</li>"}</ol></details>`).join("");
  const recommendedHTML=Object.entries(recommendations).filter(([,items])=>items?.length).map(([id,items])=>`<details class="supp-list"><summary>Related to ${link(id)}</summary><ol>${items.map(item=>`<li>${link(item)}</li>`).join("")}</ol></details>`).join("");
  if (!ids.length && !trendingHTML && !recommendedHTML){
    setHTML(root,'<p class="sub">No supplemental signals are available yet. The official YouTube dashboard continues to work independently.</p>',false);
    return;
  }
  setHTML(root,`${trendingHTML||""}${recommendedHTML||""}<div class="supp-video-grid">${videoBlocks}</div>`,false);
}

async function loadSupplemental(channelId){
  const root=$("supplementalBody");
  if (!root || !channelId) return;
  if (SUPPLEMENTAL_LOADS.has(channelId)){
    const cached=await SUPPLEMENTAL_LOADS.get(channelId);
    if (D?.id===channelId){
      if (cached) renderSupplemental(cached);
      else setHTML(root,'<p class="sub">Supplemental report not published for this channel yet.</p>',false);
    }
    return;
  }
  setHTML(root,'<p class="sub">Loading optional supplemental signals…</p>',false);
  const load=(async()=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch("data/supplemental-"+encodeURIComponent(channelId)+".json?t="+Date.now(),{cache:"no-store",signal:controller.signal});
      if (!response.ok) return null;
      const report=await response.json();
      return report && report.channelId===channelId ? report : null;
    }catch(error){ return null; }
    finally{ clearTimeout(timeout); }
  })();
  SUPPLEMENTAL_LOADS.set(channelId,load);
  const report=await load;
  if (D?.id!==channelId) return;
  if (report) renderSupplemental(report);
  else setHTML(root,'<p class="sub">Supplemental report not published for this channel yet. Official YouTube metrics are unaffected.</p>',false);
}

/* ===== Prompt builder ===== */
function fv(id){ return $(id).value.trim(); }
function buildPrompt(){
  const w = [];
  if (fv("f_key") && !/^AIza/.test(fv("f_key"))) w.push("API keys usually start with AIza.");
  if (fv("f_ch") && !/^UC/.test(fv("f_ch"))) w.push("Channel IDs start with UC. For a handle, use the @handle box.");
  if (fv("f_tok") && parseToken(fv("f_tok")).length < 20) w.push("That access token looks too short. It usually starts with ya29.");
  if (fv("f_cid") && !/\.apps\.googleusercontent\.com$/.test(fv("f_cid"))) w.push("OAuth client IDs end in .apps.googleusercontent.com.");
  $("f_warn").textContent = w.join(" ");
  const L = ["Update my YouTube dashboard (the yt-dashboard folder you built earlier) by hard-coding my channel connection into config.js, then give me the finished config.js.","",
    "CONFIG values:",
    "- API_KEY: " + (fv("f_key") || "(not set yet)"),
    "- CHANNEL_ID: " + (fv("f_ch") || "(not set)"),
    "- HANDLE: " + (fv("f_handle") || "(not set)"),
    "- OAUTH_CLIENT_ID: " + (fv("f_cid") || "(not set yet)"),
    "- ACCESS_TOKEN (temporary, expires in about an hour; put it in CONFIG.ACCESS_TOKEN so Analytics loads on open): " + (parseToken(fv("f_tok")) || "(not set)"),
    "- REVENUE (monetized, show estimated revenue): " + ($("f_rev").checked ? "true" : "false"),
    "- MAX_VIDEOS: " + (fv("f_max") || "200"),
    "- I will open it from: " + (fv("f_origin") || "(not decided)"),"",
    "Put these into the CONFIG block, double-check each value's format, and tell me if anything looks wrong or if the file needs another setting to work from that address."];
  if (fv("f_notes")) L.push("", "Also make these changes: " + fv("f_notes"));
  $("f_out").value = L.join("\n");
}
function copyPrompt(){
  if (!$("f_out").value) buildPrompt();
  const t = $("f_out"); t.select();
  (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).catch(() => document.execCommand("copy"));
}
function applyNow(){
  const set = (k, v) => { if (v) CONFIG[k] = v; };
  set("API_KEY", fv("f_key")); set("OAUTH_CLIENT_ID", fv("f_cid"));
  if (fv("f_ch") || fv("f_handle")){ CONFIG.CHANNEL_ID = fv("f_ch"); CONFIG.HANDLE = fv("f_handle"); }
  set("ACCESS_TOKEN", parseToken(fv("f_tok"))); if ($("f_rev").checked) CONFIG.REVENUE = true; CONFIG.MAX_VIDEOS = +fv("f_max") || 200;
  Object.assign(CH[cur], {id:CONFIG.CHANNEL_ID, handle:CONFIG.HANDLE, token:CONFIG.ACCESS_TOKEN}); renderSel(); closeGuide(); boot().then(() => { if (CONFIG.ACCESS_TOKEN.length >= 20){ TOKEN = CONFIG.ACCESS_TOKEN; loadAnalytics(); } else loadSnapshot(); });
}

const CD_MS = 20*60e3; let cdAt = 0;
function cdLeft(){ let t = cdAt; try { t = Math.max(t, +localStorage.getItem("ytd_cd") || 0); } catch(e){} return Math.max(0, t + CD_MS - Date.now()); }
function updRf(){
  const b = $("rbtn"); if (!b) return;
  const left = cdLeft(), cool = left > 0;
  $("rff").style.transform = "scaleX(" + (cool ? 1 - left/CD_MS : 1) + ")";
  $("rfl").textContent = busy && !cool ? "Refreshing…" : cool ? "Ready in " + Math.floor(left/6e4) + ":" + String(Math.ceil(left/1000) % 60).padStart(2,"0") : "Refresh";
  b.disabled = cool;
}
const slotOf = (t, ms) => Math.floor(t / ms), MIN_GAP = 60e3;
const hhmm = t => new Date(t).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
function runRefresh(manual){
  return boot(manual).then(() => {
    if (!manual && !AN && D){
      const cached = readAnalyticsCache(D.id || CONFIG.CHANNEL_ID || CONFIG.HANDLE);
      if (cached){ AN = cached.AN; lastAnSlot = slotOf(Date.now(), CONFIG.ANALYTICS_MS); learnRpm(AN.day, AN.rev); renderAnalytics(); }
    }
    if (!TOKEN && CONFIG.ACCESS_TOKEN.length >= 20) TOKEN = CONFIG.ACCESS_TOKEN;
    if (TOKEN && (manual || slotOf(Date.now(), CONFIG.ANALYTICS_MS) > lastAnSlot)) return loadAnalytics(!manual && ANR, manual);
    if (!TOKEN && (manual || slotOf(Date.now(), CONFIG.ANALYTICS_MS) > lastAnSlot)) return loadSnapshot(!manual && ANR, manual);
  });
}
function refreshAll(){
  if (cdLeft() > 0 || busy) return;
  cdAt = Date.now(); try { localStorage.setItem("ytd_cd", String(cdAt)); } catch(e){}
  updRf(); runRefresh(true);
}
let pbLast = 0;
function tick(){
  if (document.hidden) return;
  updRf();
  const u = $("upd"), due = $("due"), dot = $("dot"); if (!u) return;
  dot.classList.toggle("busy", busy);
  if (lastSlot < 0){ u.textContent = "Loading…"; due.textContent = ""; return; }
  const now = Date.now(), ms = CONFIG.REFRESH_MS, s = slotOf(now, ms);
  u.textContent = lastUpdate ? "Updated " + dhm(now - lastUpdate) + " ago" : "Not updated yet";
  due.textContent = busy ? "Refreshing now…" : "Next at " + hhmm((s + 1) * ms);
  const pb = busy ? 1 : (now - s * ms) / ms, bar = $("pbar");
  if (pb < pbLast){ bar.style.transition = "none"; bar.style.transform = "scaleX(0)"; void bar.offsetWidth; bar.style.transition = ""; }
  bar.style.transform = "scaleX(" + pb + ")"; pbLast = pb;
  // fixed to the clock: every ms-boundary of the wall clock is a refresh slot, whenever the page was opened
  if (s > lastSlot && !busy){
    if (lastUpdate && now - lastUpdate < MIN_GAP) lastSlot = s;   // data is only seconds old, wait for the next slot
    else runRefresh(false);
  }
}
async function boot(force = false){
  const me = ++bootN, key = CONFIG.CHANNEL_ID || CONFIG.HANDLE, soft = !!D && !!RKEY && RKEY === key;
  const cached = !force && (!D || RKEY !== key) ? readPublicCache(key) : null;
  busy = true; lastTry = Date.now(); lastSlot = slotOf(lastTry, CONFIG.REFRESH_MS); tick();
  if (!soft){ $("msg").innerHTML = ""; $("cmeta").textContent = "Loading…"; }
  try {
    const ready = CONFIG.API_KEY && (CONFIG.CHANNEL_ID || CONFIG.HANDLE);
    const d = cached ? cached.d : ready ? await live() : demo();
    if (me !== bootN) return;
    if (!d.vids.length) throw new Error("No public videos found on this channel.");
    CUR = d; SNAP = d.demo ? [] : recordSnap(d, !!cached);
    D = analyze(d); D.id = d.id; render(d, D, soft && !d.demo);
    if (!d.demo) loadSupplemental(d.id);
    lastUpdate = cached ? cached.t : Date.now(); if (!cached && !d.demo) writePublicCache(key, d, lastUpdate);
    RKEY = d.demo ? null : key;
    if (soft) [...$("msg").children].forEach(c => { if (!c.classList.contains("anw")) c.remove(); });
    if (!d.demo && CH[cur]){ CH[cur].label = CH[cur].label || d.name; saveChs(); renderSel(); }
    if (d.demo && !sessionStorage.getItem("guided")){ try{sessionStorage.setItem("guided","1")}catch(e){} openGuide(); }
  } catch (e) {
    if (me !== bootN) return;
    if (soft){ const o = $("msg").querySelector(".rfw"); if (o) o.remove(); $("msg").insertAdjacentHTML("beforeend", `<p class="rfw">Refresh failed (${esc(e.message)}). Still showing the last data, will retry at the next scheduled refresh.</p>`); }
    else { $("msg").innerHTML = `<p class="err">Could not load your channel: ${esc(e.message)} Check your key and channel ID. <button onclick="openGuide()">Open setup guide</button></p>`; $("cmeta").textContent = "Not connected"; }
  } finally { if (me === bootN){ busy = false; tick(); } }
}
window.chartLibraryReady.then(() => {
  applyCh();
  renderSel(); initUI();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (!D) runRefresh(false);
    else tick();
  });
  if (!document.hidden) runRefresh(false);
});

/* ===== Visual polish: count-up numbers + scroll reveal ===== */
(function(){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(root){ if (reduce) return; root.querySelectorAll(".num").forEach(el => {
    if (el.classList.contains("earnings")) return;
    if (el.dataset.c) return;
    const t = el.textContent;
    if (t.trim().startsWith("$")){ el.dataset.c = 1; return; }
    const m = t.match(/^([^\d]*)(\d[\d,]*\.?\d*)(.*)$/); if (!m) return; el.dataset.c = 1; el._counting = true;
    const target = parseFloat(m[2].replace(/,/g,"")), dec = (m[2].split(".")[1]||"").length, comma = m[2].includes(","), t0 = performance.now();
    (function f(n){ const p = Math.min(1,Math.max(0,n-t0)/1300), e = 1-Math.pow(1-p,4); let s = (target*e).toFixed(dec);
      if (comma) s = Number(s).toLocaleString(undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec});
      if (p<1){ el.textContent = m[1]+s+m[3]; requestAnimationFrame(f); } else { el.textContent = t; el._counting = false; const fin = el._final; el._final = null; if (fin != null && fin !== t && el.firstChild) setText(el.firstChild, fin); } })(t0); }); }
  ["kpis","akpis","fc","last3"].forEach(id => { const el = document.getElementById(id); countUp(el); new MutationObserver(() => countUp(el)).observe(el,{childList:true}); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:0, rootMargin:"0px 0px -40px 0px"});
  document.querySelectorAll("main>section,.grid>section").forEach((el,i) => { el.classList.add("rv"); el.style.transitionDelay = el.parentElement.classList.contains("grid") ? (i%2)*90+"ms" : "0ms"; io.observe(el); });
})();

/* scroll-spy for sidebar */
(function(){
  const links = [...document.querySelectorAll(".side a.nv")];
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const ind = document.querySelector(".ind");
  function activate(a){ links.forEach(l => l.classList.toggle("on", l === a)); ind.style.height = a.offsetHeight+"px"; ind.style.transform = `translateY(${a.offsetTop}px)`; }
  activate(links[0]); addEventListener("resize", () => activate(document.querySelector(".side a.on")));
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) activate(map.get(e.target.id)); }), {rootMargin:"-25% 0px -65% 0px"});
  map.forEach((a,id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
})();
