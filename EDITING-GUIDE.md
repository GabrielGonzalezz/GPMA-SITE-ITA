# Como editar o site do GPMA (sem código)

Tudo é feito em **https://app.pagescms.org** → entre com sua conta do GitHub → abra o repositório do site.
Cada alteração salva é publicada automaticamente em 1–2 minutos.

> Para ter acesso de edição, o dono do repositório precisa te adicionar como colaborador
> (GitHub → Settings → Collaborators).

## Duas línguas (EN / PT-BR)
O site tem um botão **EN | PT** no topo. Ele abre em português para quem usa o navegador em português, e em inglês para os demais. A escolha fica salva, e links com `?lang=pt` ou `?lang=en` abrem direto numa língua.
No painel, todo campo de texto tem um irmão com **(PT-BR)** no nome (ex.: *Title* e *Title (PT-BR)*). Se o campo PT-BR ficar vazio, o site mostra o texto em inglês.
Rótulos fixos da interface (menus, títulos de seção, cabeçalhos de tabela) ficam em `_data/i18n.yml`.

## Imagem de abertura (hero)
**Menu: Home carousel.** Cada slide é uma foto (*type = image*) ou a animação de impressão (*type = animation*). As fotos aparecem em preto e branco, atrás da frase principal. Use fotos horizontais, de preferência com pelo menos 1600 px de largura.
A frase grande e o texto de apresentação ficam em **Site texts & contact** (*Home – big headline* e *Home – intro paragraph*).

## Pessoas
**Menu: People**

| Quero… | Faça |
|---|---|
| Adicionar um aluno | **Add an entry** → preencha nome, *Role*, *Status = current*, tema, bio → **Save**. A página dele é criada sozinha em `/people/nome-do-aluno/`. |
| Colocar a foto | No campo **Photo**, envie a imagem (quadrada, mín. 400×400 px). Sem foto, aparecem as iniciais. |
| Aluno defendeu | Mude *Role = Alumni*, *Status = alumni*, preencha *Degree* (ex.: `M.Sc. 2027`), *Thesis* e *Now* (onde está hoje). Ele vai sozinho para a lista de egressos. |
| Remover alguém | Abra a pessoa → menu **⋯ → Delete**. |
| Mudar a ordem | Campo **Order**: número menor aparece primeiro (professor = 1, doutorandos ≈ 10, mestrandos ≈ 20, IC ≈ 30, egressos ≥ 100). |
| Ligar publicações à pessoa | Campo **pub_key**: o sobrenome como aparece nas listas de autores (ex.: `Dutra`, `Dias Filho`). Todas as publicações com esse nome aparecem na página dela. |

**Bio:** use o resumo do Lattes ou do LinkedIn, em terceira pessoa, 2–3 parágrafos. Preencha *Bio* (inglês) e *Bio (PT-BR)*.

## Publicações
**Menu: Publications → Add an item** (a lista já é ordenada por ano automaticamente).
Preencha ano, título, autores, revista/congresso, tipo, linha de pesquisa e o **DOI** (só o código, ex. `10.1016/j.addma.2021.101900`).
A publicação aparece na home (se estiver entre as 6 mais recentes), na página de publicações e na página de cada autor do grupo.

## Parceiros e logos (seções Collaboration e Affiliations & Funding)
**Menu: Partners & logos → Add an item**: nome, país, **Group** (Home institution / Academic partners / Industry & research institutes / Funding agencies), **Logo** (PNG com fundo transparente ou SVG, de preferência horizontal) e o texto *What we do together*.
- Sem logo, aparece o nome curto (*Short name*).
- Agências de fomento (sem texto em *What we do together*) aparecem só na faixa de logos.

## Notícias, projetos, infraestrutura, software, parceiros
Cada um tem seu menu. **Add an item** para incluir, arraste para reordenar, lixeira para remover.
- *News*: coloque as mais novas no topo (a home mostra as 6 primeiras).
- *Projects*: *Status = current* aparece em destaque; *past* vai para a tabela "Completed projects".
- *Facilities*: cada item aceita uma foto (fundo branco fica melhor) e o modelo do equipamento.
- *Research lines*: cada linha tem uma figura (SVG ou PNG) e uma referência-chave com DOI.

## Textos gerais e contato
**Menu: Site texts & contact** – título e texto da home, e-mail, telefone, endereço, textos de "Collaboration" e "Join the group".

## Dicas
- Imagens ficam em `assets/img/` (o painel cuida disso).
- Se algo quebrar, o GitHub guarda o histórico: *Commits* → abra a versão anterior → *Revert*.

## Trocar o desenho que a animação "imprime"
A animação do topo desenha o arquivo `assets/data/hero-toolpath.json`, gerado a partir de um desenho em linhas (traço branco sobre fundo claro, como `tools/elefante-drawing.jpg`).
Para usar outro desenho, rode no computador: `python tools/make_hero_toolpath.py meu-desenho.jpg` (requer numpy, opencv-python, scikit-image, scipy e pillow). O script cria o JSON com as paredes (linhas do desenho) e o preenchimento a ±45°.
