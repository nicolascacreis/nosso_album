/* Carrega as páginas adicionadas pelo /admin, coloca no livro e só então liga o script.js */
(async () => {
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function folhaFoto(p, i) {
    const ar = Math.min(Math.max(Number(p.ar) || 0.75, 0.45), 1.4);
    return `
      <section class="sheet">
        <div class="face front page photo" style="--bg:url('${esc(p.bg)}'); --ar:${ar}">
          <div class="mat ${i % 2 ? "tilt-r" : "tilt-l"}">
            <span class="tape tape--l"></span><span class="tape tape--r"></span>
            <img src="${esc(p.photo)}" alt="Nós dois" draggable="false" />
            <span class="mat__heart">♥</span>
          </div>
          <i class="shade"></i>
        </div>
        <div class="face back page dark"><i class="shade"></i></div>
      </section>`;
  }

  function folhaTexto(p) {
    const paragrafos = String(p.texto).split(/\n+/).filter(Boolean).map((t) => `<p class="serif">${esc(t)}</p>`).join("");
    return `
      <section class="sheet">
        <div class="face front page paper">
          <svg class="fl fl--tl"><use href="#fl" /></svg>
          <svg class="fl fl--br"><use href="#fl" /></svg>
          <div class="note">
            ${p.titulo ? `<p class="hand ruby">${esc(p.titulo)}</p>` : ""}
            ${paragrafos}
          </div>
          <i class="shade"></i>
        </div>
        <div class="face back page paper"><i class="shade"></i></div>
      </section>`;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch("/api/pages", { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const { pages } = await r.json();
      if (pages && pages.length) {
        const html = pages.map((p, i) => folhaFoto(p, i) + (p.texto ? folhaTexto(p) : "")).join("");
        // entram antes da carta, pra carta e o final continuarem no fim do álbum
        const carta = document.querySelector("#book .letter").closest(".sheet");
        carta.insertAdjacentHTML("beforebegin", html);
      }
    }
  } catch (_) { /* sem API (ex.: Live Server local): o álbum abre normal */ }

  const s = document.createElement("script");
  s.src = "script.js";
  document.body.appendChild(s);
})();
