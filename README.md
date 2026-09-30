# Nosso álbum 💿

Álbum de fotos em formato de livro para celular: vire as páginas deslizando o dedo,
com música, tempo juntos e contagem regressiva.

## Rodar no VS Code
1. Abra a pasta no VS Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito em `index.html` > **Open with Live Server**.
4. Aperte F12 e ative o modo celular (Ctrl+Shift+M).

## Publicar (GitHub + Vercel)
```bash
git init
git add .
git commit -m "nosso album"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/nosso-album.git
git push -u origin main
```
Na Vercel: Add New > Project > escolha o repositório > Deploy.

## Personalizar
- Data do namoro: topo do `script.js` (`START`).
- Textos e ordem das páginas: `index.html` (cada `<section class="sheet">` é uma folha).
- Música: `music/home.mp3`.

## Adicionar fotos pelo celular (`/admin`)
Abra `https://SEU-SITE.vercel.app/admin`, digite a senha, escolha as fotos e toque em **Publicar**.
Cada foto vira uma página nova, antes da carta. Dá pra colocar (ou não) um textinho em cada uma.
Lá embaixo também dá pra reordenar e apagar as páginas que você adicionou.

Configuração única na Vercel:
1. **Storage > Create > Blob** (escolha **Public**) e conecte ao projeto.
2. **Settings > Environment Variables**, adicione `ADMIN_PASSWORD` (a senha do /admin).
3. Opcional, para o botão "Sugerir" escrever com IA olhando a foto: `ANTHROPIC_API_KEY`.
   Sem ela, o botão usa textinhos prontos.
4. Faça um novo deploy (Deployments > Redeploy) para valer as variáveis.
