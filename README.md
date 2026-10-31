# Helpdesk Kanban — Gerenciador de Tickets de Suporte

![CI - Testes](https://github.com/felipepribeiro697-debug/BootcampII-Trabalho-Final/actions/workflows/ci.yml/badge.svg)

Bootcamp II · Etapa 03 · Desafio final em grupo — CEUB

**Repositório:** https://github.com/felipepribeiro697-debug/BootcampII-Trabalho-Final

Sistema estilo **Kanban** para abrir, categorizar e acompanhar chamados técnicos de **hardware e redes**. Cada chamado tem prioridade (com prazo de SLA), técnico responsável e filial de origem. Chamados **críticos** podem virar **issues no GitHub** automaticamente.

---

## 1. Integrantes

| Nome | Matrícula | Usuário GitHub | Funcionalidade (dono) | Principal PR |
|---|---|---|---|---|
| Felipe Domingos Ribeiro Pereira | 22604250 | @felipepribeiro697-debug | Backend e persistência (SQLite), testes + GitHub Actions, Docker | [#_](link) |
| Gabriel Ribeiro de Sousa | 22601424 | @bielrsousa | Integração com APIs externas (ViaCEP e GitHub Issues), frontend Kanban | [#_](link) |

Divisão das PRs em [`docs/PLANO-DE-PRS.md`](docs/PLANO-DE-PRS.md). Todo integrante escreve código.

---

## 2. A aplicação

**Funcionalidades**
- Quadro Kanban com 4 colunas: *Aberto → Em andamento → Aguardando peça/terceiro → Resolvido* (arrastar e soltar, ou pelo seletor do card).
- Criar, listar, mover e excluir chamados; filtro por prioridade.
- Prioridades com SLA: crítica 4h · alta 8h · média 24h · baixa 72h. O card mostra as horas restantes ou "SLA estourado".
- Regra de negócio: um chamado só sai de *Aberto* com um técnico responsável atribuído.
- Cadastro de técnicos e de filiais (a filial é cadastrada só com nome + CEP).

**APIs externas consumidas**
| API | Para quê | Precisa de chave? |
|---|---|---|
| [ViaCEP](https://viacep.com.br) | Preenche logradouro, bairro, cidade e UF da filial a partir do CEP | Não |
| [GitHub REST — Issues](https://docs.github.com/rest/issues/issues#create-an-issue) | Chamado com prioridade **crítica** vira issue no repositório configurado | Sim (opcional) — `GITHUB_TOKEN` + `GITHUB_REPO` |

Sem as variáveis do GitHub a aplicação funciona normalmente; só a criação de issues fica desligada (o topo da tela mostra o estado).

**Banco de dados:** SQLite (arquivo `data/helpdesk.db`, via módulo nativo `node:sqlite` — não precisa compilar nada). Tabelas `tickets`, `tecnicos` e `filiais`.

**Stack:** Node.js 22+ · Express · SQLite (módulo nativo `node:sqlite`) · HTML/CSS/JS puro · Jest + Supertest · GitHub Actions · Docker.

```
src/
  server.js            inicia o servidor
  app.js               monta o Express (recebe banco e serviços → testável)
  db.js                schema SQLite + técnicos de exemplo
  regras.js            regras de negócio (funções puras: validação, SLA, CEP)
  routes/tickets.js    CRUD de chamados + envio ao GitHub
  routes/cadastros.js  técnicos, filiais e consulta de CEP
  services/viacep.js   cliente ViaCEP
  services/github.js   cliente GitHub Issues
public/                frontend Kanban
tests/                 testes Jest (unitários + API)
.github/workflows/ci.yml
Dockerfile
```

**Endpoints**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/tickets?status=&prioridade=` | lista chamados (com SLA calculado) |
| POST | `/api/tickets` | cria chamado `{titulo, descricao, categoria, prioridade, tecnico_id, filial_id}` |
| PATCH | `/api/tickets/:id` | muda `status`, `tecnico_id` ou `prioridade` |
| DELETE | `/api/tickets/:id` | exclui |
| POST | `/api/tickets/:id/github` | força criação da issue |
| GET/POST/DELETE | `/api/tecnicos` | técnicos |
| GET/POST/DELETE | `/api/filiais` | filiais (`{nome, cep}`) |
| GET | `/api/cep/:cep` | consulta ViaCEP |

---

## 3. Como executar

### Localmente
```bash
npm install
npm start
# abra http://localhost:3000
```

### Com Docker (imagem do Docker Hub)
Imagem: https://hub.docker.com/r/USUARIO_DOCKERHUB/helpdesk-kanban

```bash
docker run -d --name helpdesk -p 3000:3000 -v helpdesk-dados:/app/data USUARIO_DOCKERHUB/helpdesk-kanban:latest
# abra http://localhost:3000
```

Com a integração do GitHub ligada:
```bash
docker run -d --name helpdesk -p 3000:3000 -v helpdesk-dados:/app/data \
  -e GITHUB_TOKEN=seu_token -e GITHUB_REPO=usuario/repositorio \
  USUARIO_DOCKERHUB/helpdesk-kanban:latest
```

### Gerar e publicar a imagem
```bash
docker build -t USUARIO_DOCKERHUB/helpdesk-kanban:latest .
docker login
docker push USUARIO_DOCKERHUB/helpdesk-kanban:latest
```

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3000` | porta HTTP |
| `DB_PATH` | `data/helpdesk.db` (`/app/data/helpdesk.db` no Docker) | arquivo do SQLite |
| `GITHUB_TOKEN` | — | token *fine-grained* com permissão **Issues: Read and write** |
| `GITHUB_REPO` | — | `usuario/repositorio` onde as issues serão abertas |

---

## 4. Testes

```bash
npm test
```
18 testes Jest em `tests/`:
- `regras.test.js` — validação de chamado, CEP, regra de mudança de status, SLA e montagem da issue.
- `api.test.js` — CRUD pela API com banco em memória; ViaCEP e GitHub são simulados (mocks), então os testes não dependem de internet.

O workflow `.github/workflows/ci.yml` roda os testes em toda PR e todo push para a `main`.

---

## 5. Evidências

### PR bloqueada pelo CI
_Colar aqui o print da PR com teste quebrado de propósito e o merge bloqueado._

![PR bloqueada](docs/evidencias/pr-bloqueada.png)

### Conflito de merge resolvido
_Relatar: quais branches, qual arquivo, o que conflitou e como o grupo resolveu._

### Proteção da main
_Print de Settings → Branches/Rules mostrando "Require a pull request" (1 aprovação) e "Require status checks" com o check `testes`._
