import { autorizado } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (autorizado(req)) return res.status(200).json({ ok: true });
  await new Promise((r) => setTimeout(r, 700)); // atrapalha tentativa de adivinhar a senha
  return res.status(401).json({ erro: "Senha incorreta" });
}
