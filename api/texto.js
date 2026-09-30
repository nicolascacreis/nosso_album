import { autorizado, corpoJson, lerDataUrlJpeg } from "./_lib.js";

/* Textinhos de reserva, usados se não houver ANTHROPIC_API_KEY configurada */
const BANCO = [
  { titulo: "esse dia", texto: "Tem dia que a gente nem percebe que vai virar lembrança. Esse virou. E eu guardo ele com carinho, porque você estava nele." },
  { titulo: "do seu lado", texto: "Eu vou te confessar: metade das minhas fotos favoritas só é favorita porque você está nelas." },
  { titulo: "só a gente", texto: "O mundo podia ficar barulhento lá fora que aqui, do seu lado, tudo fica quietinho e bom." },
  { titulo: "paz", texto: "Eu não sei explicar direito, mas perto de você tudo parece mais leve. Acho que é isso que chamam de casa." },
  { titulo: "guardado", texto: "Essa foto é daquelas que eu abriria mil vezes. Não pela foto, mas por como eu me sentia naquele momento." },
  { titulo: "meu lugar favorito", texto: "Já tentei pensar em lugar melhor do que o seu lado e não achei nenhum. Continuo tentando só pra ter o prazer de voltar." },
  { titulo: "sem pressa", texto: "Com você o tempo anda diferente. Um minuto vira lembrança, e uma tarde vira história pra contar depois." },
  { titulo: "um pedacinho nosso", texto: "Mais uma página pra nossa história. E eu já estou ansioso pra ver as próximas." },
];

const SISTEMA = `Você escreve textinhos curtos para um álbum de fotos de casal. Quem fala é o namorado, apaixonado, falando com a namorada, que ele chama de "princesinha" (use esse apelido no máximo de vez em quando, não em todo texto).
Regras:
- Português do Brasil, tom carinhoso, simples e natural, como alguém de verdade falando, sem poesia exagerada nem clichê de cartão.
- "texto": 2 ou 3 frases curtas, no máximo 230 caracteres.
- "titulo": 1 a 4 palavras, minúsculas, estilo bilhete escrito à mão.
- Se houver foto, use só o que dá para ver de forma geral (clima, luz, o sentimento). NÃO invente nomes, lugares, datas ou fatos que não estejam na imagem ou na dica.
- Sem emojis e sem hashtags.
- Responda SOMENTE com JSON válido: {"titulo":"...","texto":"..."}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (!autorizado(req)) return res.status(401).json({ erro: "Senha incorreta" });

  const b = corpoJson(req);
  const chave = process.env.ANTHROPIC_API_KEY;

  if (!chave) {
    const item = BANCO[Math.floor(Math.random() * BANCO.length)];
    return res.status(200).json({ ...item, origem: "banco" });
  }

  try {
    lerDataUrlJpeg(b.photo, 1.5 * 1024 * 1024);
    const dica = String(b.dica || "").slice(0, 300);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 400,
        system: SISTEMA,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.photo.split(",")[1] } },
            { type: "text", text: dica ? `Escreva o textinho para esta foto. Dica dele sobre o momento: ${dica}` : "Escreva o textinho para esta foto." },
          ],
        }],
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || "Erro da API (" + r.status + ")");
    const bruto = (j.content || []).map((c) => c.text || "").join("").replace(/```json|```/g, "").trim();
    const out = JSON.parse(bruto);
    return res.status(200).json({ titulo: String(out.titulo || "").slice(0, 60), texto: String(out.texto || "").slice(0, 600), origem: "ia" });
  } catch (e) {
    console.error(e);
    const item = BANCO[Math.floor(Math.random() * BANCO.length)];
    return res.status(200).json({ ...item, origem: "banco", aviso: "A IA não respondeu, usei um textinho pronto." });
  }
}
