import { put, del } from "@vercel/blob";
import { autorizado, corpoJson, lerPaginas, salvarPaginas, lerDataUrlJpeg } from "./_lib.js";

const limpa = (s, max) => String(s || "").replace(/\s+\n/g, "\n").trim().slice(0, max);

export default async function handler(req, res) {
  try {
    /* ---- público: o álbum lê a lista daqui ---- */
    if (req.method === "GET") {
      res.setHeader("Cache-Control", req.query.fresh ? "no-store" : "s-maxage=20, stale-while-revalidate=120");
      let pages = [];
      try { pages = await lerPaginas(); } catch (e) { console.error(e); }
      return res.status(200).json({ pages });
    }

    /* ---- daqui pra baixo só com senha ---- */
    if (!autorizado(req)) return res.status(401).json({ erro: "Senha incorreta" });

    if (req.method === "POST") {
      const b = corpoJson(req);
      const foto = lerDataUrlJpeg(b.photo, 3.2 * 1024 * 1024);
      const fundo = lerDataUrlJpeg(b.bg, 300 * 1024);
      const ar = Math.min(Math.max(Number(b.ar) || 0.75, 0.45), 1.4);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      const opts = { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "image/jpeg", cacheControlMaxAge: 31536000 };
      const f = await put(`album/fotos/${id}.jpg`, foto, opts);
      const g = await put(`album/fotos/${id}-bg.jpg`, fundo, opts);

      const pages = await lerPaginas();
      const pagina = {
        id, photo: f.url, bg: g.url, ar: Number(ar.toFixed(3)),
        titulo: limpa(b.titulo, 60), texto: limpa(b.texto, 600), criado: new Date().toISOString(),
      };
      pages.push(pagina);
      await salvarPaginas(pages);
      return res.status(200).json({ page: pagina });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      const pages = await lerPaginas();
      const alvo = pages.find((p) => p.id === id);
      if (!alvo) return res.status(404).json({ erro: "Página não encontrada" });
      await salvarPaginas(pages.filter((p) => p.id !== id));
      try { await del([alvo.photo, alvo.bg]); } catch (e) { console.error(e); }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "PUT") {
      const ordem = Array.isArray(corpoJson(req).order) ? corpoJson(req).order : [];
      const pages = await lerPaginas();
      const porId = new Map(pages.map((p) => [p.id, p]));
      const novas = ordem.map((id) => porId.get(id)).filter(Boolean);
      pages.forEach((p) => { if (!novas.includes(p)) novas.push(p); });
      await salvarPaginas(novas);
      return res.status(200).json({ pages: novas });
    }

    return res.status(405).json({ erro: "Método não permitido" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: e.message || "Erro no servidor" });
  }
}
