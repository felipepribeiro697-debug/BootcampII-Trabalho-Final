// Testes de integracao da API: banco SQLite em memoria + APIs externas falsas (mocks).
// Nao acessam a internet, entao rodam igual no GitHub Actions.
const request = require("supertest");
const { abrirBanco, semear } = require("../src/db");
const { criarApp } = require("../src/app");

function githubFalso(ativo) {
  return {
    githubAtivo: () => ativo,
    criarIssue: jest.fn(async (t) => `https://github.com/time/helpdesk/issues/${t.id}`),
  };
}

let db;
let app;
let github;

beforeEach(() => {
  db = abrirBanco(":memory:");
  semear(db);
  github = githubFalso(true);
  app = criarApp(db, { github });
});

afterEach(() => db.close());

test("cria, lista e exclui um ticket (CRUD com persistencia)", async () => {
  const criado = await request(app)
    .post("/api/tickets")
    .send({ titulo: "Notebook nao liga", categoria: "hardware", prioridade: "media" })
    .expect(201);
  expect(criado.body.status).toBe("aberto");

  const lista = await request(app).get("/api/tickets").expect(200);
  expect(lista.body).toHaveLength(1);

  await request(app).delete(`/api/tickets/${criado.body.id}`).expect(204);
  const vazia = await request(app).get("/api/tickets").expect(200);
  expect(vazia.body).toHaveLength(0);
});

test("rejeita ticket invalido com 400", async () => {
  const r = await request(app).post("/api/tickets").send({ titulo: "x" }).expect(400);
  expect(r.body.erro).toMatch(/titulo/);
});

test("tecnico inexistente responde 400 e nao derruba o servidor", async () => {
  const r = await request(app)
    .post("/api/tickets")
    .send({ titulo: "Monitor piscando", categoria: "hardware", prioridade: "baixa", tecnico_id: 999 })
    .expect(400);
  expect(r.body.erro).toMatch(/Tecnico nao encontrado/);

  const { body: t } = await request(app)
    .post("/api/tickets")
    .send({ titulo: "Teclado com teclas falhando", categoria: "hardware", prioridade: "baixa" });
  await request(app).patch(`/api/tickets/${t.id}`).send({ tecnico_id: 999 }).expect(400);

  // servidor continua respondendo
  await request(app).get("/api/saude").expect(200);
});

test("JSON invalido no corpo responde 400", async () => {
  const r = await request(app)
    .post("/api/tickets")
    .set("Content-Type", "application/json")
    .send("{ruim")
    .expect(400);
  expect(r.body.erro).toMatch(/JSON invalido/);
});

test("ticket critico vira issue no GitHub automaticamente", async () => {
  const r = await request(app)
    .post("/api/tickets")
    .send({ titulo: "Servidor de arquivos fora do ar", categoria: "rede", prioridade: "critica" })
    .expect(201);
  expect(github.criarIssue).toHaveBeenCalledTimes(1);
  expect(r.body.github_issue_url).toMatch(/issues\/\d+$/);
});

test("nao move ticket sem tecnico; move depois de atribuir", async () => {
  const { body: t } = await request(app)
    .post("/api/tickets")
    .send({ titulo: "Wi-Fi lento no 3o andar", categoria: "rede", prioridade: "alta" });

  await request(app).patch(`/api/tickets/${t.id}`).send({ status: "em_andamento" }).expect(400);

  const ok = await request(app).patch(`/api/tickets/${t.id}`).send({ tecnico_id: 1, status: "em_andamento" }).expect(200);
  expect(ok.body.status).toBe("em_andamento");
  expect(ok.body.tecnico_nome).toBe("Ana Souza");
});
