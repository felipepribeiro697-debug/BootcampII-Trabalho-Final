# Helpdesk Kanban — Gerenciador de Tickets de Suporte

![CI - Testes](https://github.com/felipepribeiro697-debug/BootcampII-Trabalho-Final/actions/workflows/ci.yml/badge.svg)
![Docker - Imagem](https://github.com/felipepribeiro697-debug/BootcampII-Trabalho-Final/actions/workflows/docker.yml/badge.svg)

Bootcamp II · Etapa 03 · Desafio final em grupo — CEUB

**Repositório:** https://github.com/felipepribeiro697-debug/BootcampII-Trabalho-Final

Sistema estilo **Kanban** para abrir, categorizar e acompanhar chamados técnicos de **hardware e redes**. Cada chamado tem prioridade (com prazo de SLA), técnico responsável e filial de origem. Chamados **críticos** podem virar **issues no GitHub** automaticamente.

---

## 1. Integrantes

| Nome | Matrícula | Usuário GitHub | Funcionalidade (dono) | Principal PR |
|---|---|---|---|---|
| Felipe Domingos Ribeiro Pereira | 22604250 | @felipepribeiro697-debug | Backend e persistência (SQLite), testes + GitHub Actions, Docker | [#1](https://github.com/felipepribeiro697-debug/BootcampII-Trabalho-Final/pull/1) |
| Gabriel Ribeiro de Sousa | 22601424 | @bielrsousa | Integração com APIs externas (ViaCEP e GitHub Issues), frontend Kanban | [#4](https://github.com/felipepribeiro697-debug/BootcampII-Trabalho-Final/pull/4) |

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
  asyncHandler.js      encaminha erros das rotas async para o handler de erro
  routes/tickets.js    CRUD de chamados + envio ao GitHub
  routes/cadastros.js  técnicos
  routes/filiais.js    filiais (endereço via ViaCEP) e consulta de CEP
  services/viacep.js   cliente ViaCEP
  services/github.js   cliente GitHub Issues
public/                frontend Kanban (HTML, CSS e JS puro)
tests/                 testes Jest (regras, API, filiais e serviços externos)
.github/workflows/ci.yml       testes a cada PR
.github/workflows/docker.yml   gera, testa e publica a imagem Docker
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
Imagem pública: https://hub.docker.com/r/steverogers03/helpdesk-kanban

Só precisa do Docker instalado (não precisa de Node nem do código):
```bash
docker run -d --name helpdesk -p 3000:3000 -v helpdesk-dados:/app/data steverogers03/helpdesk-kanban:latest
```
Abra http://localhost:3000. O volume `helpdesk-dados` guarda o banco SQLite, então os chamados continuam lá se o container for recriado.

Com a integração do GitHub ligada (chamado crítico vira issue):
```bash
docker run -d --name helpdesk -p 3000:3000 -v helpdesk-dados:/app/data -e GITHUB_TOKEN=seu_token -e GITHUB_REPO=usuario/repositorio steverogers03/helpdesk-kanban:latest
```

Comandos úteis:
```bash
docker ps                      # STATUS deve mostrar "(healthy)" depois de alguns segundos
docker logs helpdesk           # mostra se a integração com o GitHub está ativa
docker stop helpdesk && docker rm helpdesk
```

### Gerar e publicar a imagem
A imagem é gerada e publicada **automaticamente** pelo workflow [`.github/workflows/docker.yml`](.github/workflows/docker.yml):
- em toda PR, ele gera a imagem e testa o `docker run` (sobe o container e chama `/api/saude`);
- no merge para a `main`, faz o mesmo teste e publica `steverogers03/helpdesk-kanban:latest` (e uma tag com o commit) no Docker Hub.

Para gerar manualmente, numa máquina com Docker:
```bash
docker build -t steverogers03/helpdesk-kanban:latest .
docker login
docker push steverogers03/helpdesk-kanban:latest
```
A imagem usa `node:22-slim`, instala só as dependências de produção, roda com o usuário `node` (não root) e tem *healthcheck* em `/api/saude`.

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
Testes Jest em `tests/` (o total aparece no resumo do `npm test`):
- `regras.test.js` — validação de chamado, CEP, regra de mudança de status, SLA (que congela quando o chamado é resolvido) e montagem da issue.
- `api.test.js` — CRUD de chamados e técnicos pela API com banco em memória, incluindo os casos de erro (técnico inexistente, JSON inválido, regras do Kanban).
- `filiais.test.js` — cadastro de filial pelo CEP e abertura de issue para chamado crítico.
- `servicos.test.js` — clientes do ViaCEP e do GitHub (URL, headers, conversão de campos e erros).

ViaCEP e GitHub são simulados (mocks) em todos os testes, então nenhum depende de internet.

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
