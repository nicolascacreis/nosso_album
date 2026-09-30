import crypto from "node:crypto";
import { put, list } from "@vercel/blob";

const CAMINHO = "album/pages.json";

/* Confere a senha enviada pelo celular com a variável ADMIN_PASSWORD da Vercel */
export function autorizado(req) {
  const senha = process.env.ADMIN_PASSWORD || "";
  if (!senha) return false;
  let enviada = "";
  try { enviada = decodeURIComponent(String(req.headers["x-admin-password"] || "")); } catch (_) {}
  const a = crypto.createHash("sha256").update(enviada).digest();
  const b = crypto.createHash("sha256").update(senha).digest();
  return crypto.timingSafeEqual(a, b);
}

export function corpoJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch (_) { return {}; }
}

/* Lê a lista de páginas. Se falhar, joga erro (assim nunca apagamos a lista sem querer). */
export async function lerPaginas() {
  const { blobs } = await list({ prefix: CAMINHO, limit: 1 });
  if (!blobs.length) return [];
  const r = await fetch(blobs[0].url + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error("Não consegui ler a lista de páginas (" + r.status + ")");
  const j = await r.json();
  return Array.isArray(j.pages) ? j.pages : [];
}

export async function salvarPaginas(pages) {
  await put(CAMINHO, JSON.stringify({ pages }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export function lerDataUrlJpeg(s, maxBytes) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(s || ""));
  if (!m) throw new Error("Imagem inválida");
  const buf = Buffer.from(m[1], "base64");
  if (buf.length > maxBytes) throw new Error("Imagem grande demais");
  return buf;
}
