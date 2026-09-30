(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  /* =========================================================
     CONTADORES  (data do namoro: 04/07/2026)
     ========================================================= */
  const START = new Date(2026, 6, 4, 0, 0, 0);
  const fmtDate = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const labelMonths = (n) => (n % 12 === 0 ? plural(n / 12, "ano", "anos") : plural(n, "mês", "meses"));

  function monthsBetween(from, to) {
    let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    if (new Date(from.getFullYear(), from.getMonth() + m, from.getDate()) > to) m--;
    return Math.max(m, 0);
  }
  function splitDiff(ms) {
    const s = Math.floor(ms / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }

  const RING_LEN = 2 * Math.PI * 52;
  const ringFg = $("ringFg");

  function tick() {
    const now = new Date();

    if (now < START) {
      const t = splitDiff(START - now);
      $("daysNum").textContent = 0;
      $("cH").textContent = pad(t.h); $("cM").textContent = pad(t.m); $("cS").textContent = pad(t.s);
      $("nextLabel").textContent = "Falta pouco pra começar";
      $("nextCount").textContent = `${t.d}d ${pad(t.h)}h ${pad(t.m)}m`;
      $("nextDate").textContent = fmtDate(START);
      return;
    }

    const t = splitDiff(now - START);
    $("daysNum").textContent = t.d;
    $("cH").textContent = pad(t.h);
    $("cM").textContent = pad(t.m);
    $("cS").textContent = pad(t.s);

    const m = monthsBetween(START, now);
    const last = new Date(START.getFullYear(), START.getMonth() + m, START.getDate());
    const extra = Math.floor((now - last) / 86400000);
    $("monthsText").textContent = m > 0
      ? `${labelMonths(m)} e ${plural(extra, "dia", "dias")} de nós dois`
      : `${plural(extra, "dia", "dias")} de nós dois`;

    const nextN = m + 1;
    const next = new Date(START.getFullYear(), START.getMonth() + nextN, START.getDate());
    const c = splitDiff(next - now);
    $("nextLabel").textContent = `Faltam pra completarmos ${labelMonths(nextN)}`;
    $("nextCount").textContent = `${plural(c.d, "dia", "dias")}, ${pad(c.h)}h ${pad(c.m)}min ${pad(c.s)}s`;
    $("nextDate").textContent = fmtDate(next);

    const p = (now - last) / (next - last);
    ringFg.style.strokeDashoffset = String(RING_LEN * (1 - Math.min(Math.max(p, 0), 1)));

    const oneYear = new Date(START.getFullYear() + 1, START.getMonth(), START.getDate());
    if (now < oneYear) {
      const days = Math.ceil((oneYear - now) / 86400000);
      $("yearText").textContent = `Pra completar 1 ano de nós, em ${fmtDate(oneYear)}, faltam ${plural(days, "dia", "dias")}.`;
    } else {
      $("yearText").textContent = "Já passamos de 1 ano juntos. E o disco continua girando.";
    }
  }
  tick();
  setInterval(tick, 1000);

  /* =========================================================
     MÚSICA
     ========================================================= */
  const song = $("song");
  const bar = $("bar");
  const barFill = $("barFill");
  let musicPending = false;

  function setPlaying(on) {
    document.body.classList.toggle("is-playing", on);
    $("playBtn").setAttribute("aria-label", on ? "Pausar" : "Tocar");
  }
  async function play() {
    try { await song.play(); setPlaying(true); }
    catch (e) { setPlaying(false); if (song.error) $("deckNote").hidden = false; }
  }
  function pause() { song.pause(); setPlaying(false); musicPending = false; }
  function toggle() { song.paused ? play() : pause(); }

  $("playBtn").addEventListener("click", toggle);
  $("pill").addEventListener("click", toggle);
  song.addEventListener("error", () => { $("deckNote").hidden = false; });
  song.addEventListener("timeupdate", () => {
    const p = song.duration ? (song.currentTime / song.duration) * 100 : 0;
    barFill.style.width = p + "%";
  });

  // segurança para iPhone: se o play() da primeira vez não passou, tenta no próximo toque
  ["click", "touchend"].forEach((ev) =>
    document.addEventListener(ev, () => { if (musicPending && song.paused) play(); if (!song.paused) musicPending = false; }, { passive: true })
  );

  let seeking = false;
  function seek(e) {
    if (!song.duration) return;
    const r = bar.getBoundingClientRect();
    song.currentTime = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * song.duration;
  }
  bar.addEventListener("pointerdown", (e) => { seeking = true; bar.setPointerCapture(e.pointerId); seek(e); });
  bar.addEventListener("pointermove", (e) => { if (seeking) seek(e); });
  bar.addEventListener("pointerup", () => { seeking = false; });
  bar.addEventListener("pointercancel", () => { seeking = false; });

  /* =========================================================
     LIVRO: virar páginas
     ========================================================= */
  const book = $("book");
  const stage = document.querySelector(".stage");
  const sheets = [...book.querySelectorAll(".sheet")];
  const N = sheets.length;
  sheets.forEach((s, i) => {
    s.querySelectorAll(".face").forEach((f) => f.insertAdjacentHTML("beforeend", '<i class="curl"></i>'));
    if (i > 0 && i < sheets.length - 1) {
      s.querySelector(".front").insertAdjacentHTML("beforeend",
        '<b class="fold"></b><span class="turn"><em>vire a página</em><i>→</i></span>');
    }
    s._f = s.querySelector(".front .shade");
    s._b = s.querySelector(".back .shade");
  });

  let cur = 0;          // quantas folhas já foram viradas
  let animating = false;
  let opened = false;

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  let bend = 0; // -1 (canto de cima) ... 1 (canto de baixo)
  function render(i, deg) {
    const s = sheets[i];
    const t = clamp(-deg / 180, 0, 1);
    const sin = Math.sin(t * Math.PI);
    s.style.transform = `translateZ(${(sin * 7).toFixed(1)}px) rotateY(${deg}deg) rotateX(${(bend * sin * 8).toFixed(2)}deg) skewY(${(bend * sin * -3.2).toFixed(2)}deg)`;
    const cx = 12 + (t < 0.5 ? t * 2 : (1 - t) * 2) * 76;
    s.style.setProperty("--cx", cx.toFixed(1) + "%");
    s.style.setProperty("--ci", (sin * 0.34).toFixed(3));
    s.style.visibility = deg <= -179.5 ? "hidden" : "visible";
    s._f.style.opacity = t < 0.5 ? (t * 1.0).toFixed(3) : 0;
    s._b.style.opacity = t >= 0.5 ? ((1 - t) * 1.0).toFixed(3) : 0;
    s.style.boxShadow = t > 0 && t < 1
      ? `${(-10 * t).toFixed(1)}px 0 ${(28 * sin).toFixed(1)}px rgba(0,0,0,${(0.5 * sin).toFixed(2)})`
      : "none";
    const under = sheets[i + 1];
    if (under) under._f.style.opacity = (sin * 0.55).toFixed(3);
  }

  function setZ() {
    sheets.forEach((s, i) => { s.style.zIndex = i < cur ? i : N - i; });
  }

  function mark(n) {
    sheets.forEach((s, i) => s.classList.toggle("is-current", i === n));
  }

  function updateUI() {
    $("count").innerHTML = cur === 0 ? "&nbsp;" : `${cur + 1} / ${N}`;
  }

  function tween(i, from, to, dur) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      (function frame(now) {
        const p = clamp((now - t0) / dur, 0, 1);
        render(i, from + (to - from) * ease(p));
        p < 1 ? requestAnimationFrame(frame) : resolve();
      })(t0);
    });
  }

  function onOpen() {
    if (opened) return;
    opened = true;
    document.body.classList.add("opened");
    musicPending = true;
    play();
  }

  async function flipForward(dur = 850, fromDeg = 0) {
    if (animating || cur >= N - 1) return;
    animating = true;
    if (!fromDeg) bend = 0.6;
    const i = cur;
    if (i === 0) onOpen();
    sheets[i].style.zIndex = 1000;
    mark(i + 1);
    await tween(i, fromDeg, -180, dur * (1 - Math.abs(fromDeg) / 180 * 0.7));
    cur++;
    setZ(); updateUI();
    animating = false;
  }

  async function flipBack(dur = 850, fromDeg = -180) {
    if (animating || cur <= 0) return;
    animating = true;
    if (fromDeg === -180) bend = 0.6;
    const i = cur - 1;
    sheets[i].style.zIndex = 1000;
    mark(i);
    await tween(i, fromDeg, 0, dur * (1 - (180 - Math.abs(fromDeg)) / 180 * 0.7));
    cur--;
    setZ(); updateUI();
    animating = false;
  }

  async function revert(i, deg, wasForward) {
    animating = true;
    await tween(i, deg, wasForward ? 0 : -180, 300);
    setZ();
    mark(cur);
    animating = false;
  }

  /* ---------- arrastar / tocar ---------- */
  let drag = null;

  stage.addEventListener("pointerdown", (e) => {
    if (animating || peeking) return;
    if (e.target.closest(".no-flip, button, a")) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), dir: 0, target: -1, deg: 0, id: e.pointerId };
  });

  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.dir) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }
      const dir = dx < 0 ? 1 : -1;
      const target = dir === 1 ? cur : cur - 1;
      if (target < 0 || target > N - 2) { drag = null; return; }
      drag.dir = dir;
      drag.target = target;
      if (target === 0) onOpen();
      sheets[target].style.zIndex = 1000;
      mark(dir === 1 ? target + 1 : target);
      try { stage.setPointerCapture(drag.id); } catch (_) {}
    }
    const br = book.getBoundingClientRect();
    bend = clamp(((e.clientY - br.top) / br.height) * 2 - 1, -1, 1);
    const w = br.width;
    const progress = clamp(Math.abs(dx) / (w * 0.85), 0, 1);
    drag.progress = progress;
    // arrastar na direção certa aumenta o progresso; na contrária, reduz
    const signed = drag.dir === 1 ? clamp(-dx / (w * 0.85), 0, 1) : clamp(dx / (w * 0.85), 0, 1);
    drag.progress = signed;
    drag.deg = drag.dir === 1 ? -180 * signed : -180 * (1 - signed);
    render(drag.target, drag.deg);
  });

  async function endDrag(e, cancelled) {
    if (!drag) return;
    const d = drag;
    drag = null;

    // toque simples: metade direita avança, esquerda volta
    if (!d.dir) {
      if (cancelled) return;
      if (cur === 0) flipForward();
      return;
    }

    const dt = Math.max(performance.now() - d.t, 1);
    const velocity = Math.abs(e.clientX - d.x) / dt; // px/ms
    const commit = !cancelled && (d.progress > 0.28 || (velocity > 0.25 && Math.abs(e.clientX - d.x) > 30));

    if (d.dir === 1) {
      if (commit) { animating = false; cur = d.target; await flipForward(700, d.deg); }
      else await revert(d.target, d.deg, true);
    } else {
      if (commit) { animating = false; cur = d.target + 1; await flipBack(700, d.deg); }
      else await revert(d.target, d.deg, false);
    }
  }

  stage.addEventListener("pointerup", (e) => endDrag(e, false));
  stage.addEventListener("pointercancel", (e) => endDrag(e, true));

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") flipForward();
    if (e.key === "ArrowLeft") flipBack();
  });

  $("homeBtn").addEventListener("click", async () => {
    while (cur > 0) {
      while (animating) await new Promise((r) => setTimeout(r, 30));
      await flipBack(330);
    }
  });

  /* ---------- beijinho ---------- */
  const heartsBox = $("hearts");
  $("heartBtn").addEventListener("click", () => {
    const symbols = ["♥", "♥", "♥", "❤"];
    for (let i = 0; i < 24; i++) {
      const h = document.createElement("span");
      h.className = "heart";
      h.textContent = symbols[i % symbols.length];
      h.style.left = 5 + Math.random() * 90 + "vw";
      h.style.fontSize = 16 + Math.random() * 30 + "px";
      h.style.animationDuration = 2.6 + Math.random() * 2.4 + "s";
      h.style.animationDelay = Math.random() * 0.8 + "s";
      h.style.setProperty("--drift", Math.random() * 80 - 40 + "px");
      heartsBox.appendChild(h);
      setTimeout(() => h.remove(), 6500);
    }
    if (navigator.vibrate) navigator.vibrate(30);
  });

  /* ---------- capa dá uma espiadinha pra convidar ---------- */
  let peeking = false;
  async function peek() {
    if (opened) return;
    if (!animating && !drag) {
      peeking = true; bend = 0.7;
      await tween(0, 0, -17, 380);
      await tween(0, -17, 0, 520);
      peeking = false;
    }
    setTimeout(peek, 3800);
  }
  setTimeout(peek, 2200);

  /* ---------- início ---------- */
  sheets.forEach((_, i) => render(i, 0));
  setZ();
  mark(0);
  updateUI();
})();
