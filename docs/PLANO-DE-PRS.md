# Plano de PRs — Felipe e Gabriel

Ferramenta: **GitHub Desktop** (https://desktop.github.com — já instala o Git junto) + site do GitHub para abrir/revisar PRs.

A pasta `etapas/` (fora do repositório) tem os arquivos de cada PR, já testados na ordem abaixo. Cada PR = **copiar os arquivos da etapa para dentro da pasta do repositório, mantendo as subpastas, e substituir quando perguntar**.

| # | Branch | Quem faz | Quem revisa | O que entra | Testes depois |
|---|---|---|---|---|---|
| 0 | `main` (commit direto, antes da proteção) | Felipe | — | README, `.gitignore`, `.env.example`, `package.json` vazio, este plano | — |
| 1 | `feature/backend-tickets` | Felipe | Gabriel | banco SQLite, regras de negócio, API de chamados e técnicos | app sobe |
| 2 | `feature/testes-ci` | Felipe | Gabriel | 17 testes Jest + workflow do GitHub Actions | 17 ✔ |
| 3 | `feature/integracao-apis` | Gabriel | Felipe | ViaCEP (filiais) + GitHub Issues (críticos) + teste da filial | 18 ✔ |
| 4 | `feature/frontend-kanban` | Gabriel | Felipe | tela Kanban (HTML/CSS/JS) | 18 ✔ |
| 5 | `feature/docker` | Felipe | Gabriel | `Dockerfile`, `.dockerignore`, link do Docker Hub no README | 18 ✔ |
| 6 | `test/ci-bloqueia-merge` | Gabriel | Felipe | teste de fogo (quebra um teste de propósito) | 17 ✔ / 1 ✘ |

Cada um fica com 3 PRs de código e revisa as 3 do outro.

---

## Preparação (uma vez)

**Felipe**
1. GitHub → **New repository** → nome `helpdesk-kanban` → **Public** → *sem* README/.gitignore/licença → Create.
2. **Settings → Collaborators → Add people** → usuário do Gabriel. Gabriel aceita o convite no e-mail ou em github.com/notifications.
3. GitHub Desktop → **File → Clone repository** → `helpdesk-kanban` → escolha uma pasta **nova** (ex.: `...\4. Bootcamp II\helpdesk-kanban`). Não clone dentro da pasta do trabalho final.

**Gabriel**
1. Instala o GitHub Desktop, faz login, **File → Clone repository** → `felipepribeiro697-debug/helpdesk-kanban`.
2. Recebe do Felipe a pasta `etapas` (zip por WhatsApp/Drive).

## Etapa 0 — Felipe, direto na main
1. Copie o conteúdo de `etapas/0-main-inicial-FELIPE` para a pasta do repositório.
2. GitHub Desktop → resumo: `Estrutura inicial do projeto` → **Commit to main** → **Publish/Push origin**.
3. **Proteja a main** (site): Settings → Rules → Rulesets → **New branch ruleset** → nome `protege-main` → Enforcement **Active** → Target branches: **Include default branch** → marque **Require a pull request before merging** (Required approvals: **1**) → Create.
   Depois da etapa 2, volte e marque também **Require status checks to pass** → adicione o check **`testes`**.

## Ciclo de cada PR (GitHub Desktop)
1. **Fetch origin** / **Pull origin** com a branch `main` selecionada (pega o que o colega já mesclou).
2. **Current branch → New branch** → nome da tabela (ex.: `feature/backend-tickets`) → *Create branch* a partir de `main`.
3. Copie os arquivos da etapa para a pasta do repositório.
4. No terminal da pasta do repositório: `npm install` e (a partir da etapa 2) `npm test` — tem que passar.
5. Faça **2 ou 3 commits pequenos** (marque só alguns arquivos por vez na lista da esquerda), ex.:
   - `Cria schema SQLite e tecnicos de exemplo`
   - `Adiciona regras de negocio e rotas de chamados`
6. **Publish branch** → **Create Pull Request** (abre o site).
7. No site: título claro, descrição (o que, por quê, como testar), **Reviewers → o colega** → Create.
8. O colega abre a aba **Files changed**, lê, deixa **pelo menos um comentário de verdade** e aprova (**Review changes → Approve**).
9. Checks verdes + aprovado → **Merge pull request** → **Delete branch**.

### Observações por etapa
- **Etapa 1:** copie também o `package.json` e o `package-lock.json` da etapa (já têm o Express).
- **Etapa 2:** o arquivo `ci.yml` precisa ficar em **`.github/workflows/ci.yml`** dentro do repositório (crie as pastas; o nome `.github` começa com ponto). Depois do merge, ative o check obrigatório (veja Etapa 0, item 3).
- **Etapa 5:** depois de publicar a imagem, troque `USUARIO_DOCKERHUB` no README pelo usuário real e teste o `docker run`.
- **Etapa 6 (teste de fogo):** em `tests/regras.test.js`, troque `toBe("72241-608")` por `toBe("errado")` → commit → PR. O Actions fica vermelho e o botão de merge fica bloqueado → **print** → desfaça a mudança na mesma branch, commit, push → verde → merge. Salve o print em `docs/evidencias/pr-bloqueada.png` (pode entrar no mesmo PR).

## Conflito de merge
Acontece quando os dois mexem no mesmo trecho do mesmo arquivo. O ponto mais provável aqui é o **README** (os dois preenchem a coluna "Principal PR"). Se o GitHub disser *"This branch has conflicts"*:
1. GitHub Desktop → na sua branch → **Branch → Update from main**.
2. Abra o arquivo marcado, mantenha as duas partes, apague as linhas `<<<<<<<`, `=======`, `>>>>>>>`.
3. `npm test` → commit `Resolve conflito com a main` → push.
4. Registre no README (seção 5): branches, arquivo, o que conflitou e como resolveram.

## Entrega no Moodle
Os dois postam o **mesmo `README.md`** final, com o link do repositório.
