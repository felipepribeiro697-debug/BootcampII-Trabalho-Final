// Filiais + consulta de CEP + issue de chamado critico, tudo com servicos externos simulados.
const request = require("supertest");
const { abrirBanco } = require("../src/db");
const { criarApp } = require("../src/app");

const enderecoFalso = {
  cep: "72241-608",
  logradouro: "Rua de Teste",
  bairro: "Bairro de Teste",
  cidade: "Brasilia",
  uf: "DF",
};

function criarViaCepFalso() {
  return {
    buscar: jest.fn(async (cep) => {
      if (String(cep).replace(/\D/g, "") === "00000000") {
        throw Object.assign(new Error("CEP nao encontrado."), { status: 404 });
      }
      return enderecoFalso;
    }),
  };
}

let app;
let viacep;

beforeEach(() => {
  viacep = criarViaCepFalso();
  app = criarApp(abrirBanco(":memory:"), { viacep });
});

test("cadastra filial com endereco do CEP e vincula ao ticket", async () => {
  const filial = await request(app).post("/api/filiais").send({ nome: "Filial Asa Norte", cep: "72241608" }).expect(201);
  expect(filial.body).toMatchObject({ nome: "Filial Asa Norte", cep: "72241-608", cidade: "Brasilia", uf: "DF" });

  const ticket = await request(app)
    .post("/api/tickets")
    .send({ titulo: "Switch sem energia", categoria: "rede", prioridade: "baixa", filial_id: filial.body.id })
    .expect(201);
  expect(ticket.body.filial_nome).toBe("Filial Asa Norte");
  expect(ticket.body.filial_cidade).toBe("Brasilia");
});

test("CEP inexistente responde 404 e nao cria a filial", async () => {
  await request(app).post("/api/filiais").send({ nome: "Filial Fantasma", cep: "00000-000" }).expect(404);
  const lista = await request(app).get("/api/filiais").expect(200);
  expect(lista.body).toHaveLength(0);
});

test("CEP malformado responde 400 sem consultar o ViaCEP", async () => {
  await request(app).post("/api/filiais").send({ nome: "Filial Sul", cep: "123" }).expect(400);
  expect(viacep.buscar).not.toHaveBeenCalled();
});

test("GET /api/cep/:cep devolve o endereco", async () => {
  const r = await request(app).get("/api/cep/72241-608").expect(200);
  expect(r.body.cidade).toBe("Brasilia");
});

test("chamado critico abre issue quando o GitHub esta ativo", async () => {
  const github = {
    githubAtivo: () => true,
    criarIssue: jest.fn(async () => "https://github.com/exemplo/repo/issues/1"),
  };
  const appGithub = criarApp(abrirBanco(":memory:"), { github, viacep });

  const r = await request(appGithub)
    .post("/api/tickets")
    .send({ titulo: "Servidor fora do ar", categoria: "hardware", prioridade: "critica" })
    .expect(201);
  expect(r.body.github_issue_url).toBe("https://github.com/exemplo/repo/issues/1");
  expect(github.criarIssue).toHaveBeenCalledTimes(1);
});

test("falha do GitHub nao impede o chamado critico de ser criado", async () => {
  const github = {
    githubAtivo: () => true,
    criarIssue: jest.fn(async () => {
      throw new Error("GitHub fora do ar");
    }),
  };
  const appGithub = criarApp(abrirBanco(":memory:"), { github, viacep });

  const r = await request(appGithub)
    .post("/api/tickets")
    .send({ titulo: "Roteador queimado", categoria: "rede", prioridade: "critica" })
    .expect(201);
  expect(r.body.github_issue_url).toBeNull();
  expect(r.body.avisoGithub).toBe("GitHub fora do ar");
});
