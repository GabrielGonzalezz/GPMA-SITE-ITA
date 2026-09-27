# Site do GPMA – Grupo de Pesquisa em Manufatura Aditiva (ITA)

Site estático feito em Jekyll, publicado no **GitHub Pages** e editado **sem código** pelo **Pages CMS**.

- Guia de edição (para quem vai manter o site): [`EDITING-GUIDE.md`](EDITING-GUIDE.md)
- Conteúdo: `_people/` (uma página por pessoa) e `_data/*.yml` (publicações, notícias, projetos…)
- Visual: `assets/css/style.css` · Estrutura: `index.html`, `_layouts/`, `_includes/`

## Publicar pela primeira vez (≈10 min)

1. Crie uma conta/organização no GitHub para o grupo (ex.: `gpma-ita`).
2. Crie um repositório **público** chamado `gpma-ita.github.io` e envie estes arquivos
   (botão **Add file → Upload files**, arraste a pasta inteira).
3. Em **Settings → Pages**, em *Source* escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
4. Em 1–2 minutos o site estará em `https://gpma-ita.github.io`.
   - Se o repositório tiver outro nome (ex.: `site`), o endereço será `https://gpma-ita.github.io/site`
     e você precisa pôr `baseurl: "/site"` no `_config.yml`.
5. Painel de edição: acesse **https://app.pagescms.org**, entre com o GitHub e abra o repositório.
   O arquivo `.pages.yml` já configura todos os formulários.
6. Domínio próprio (opcional, ex.: `gpma.ita.br`): peça à TI do ITA um registro CNAME apontando para
   `gpma-ita.github.io` e preencha o domínio em **Settings → Pages → Custom domain**.

## Rodar localmente (opcional)
```
bundle install
bundle exec jekyll serve
```
