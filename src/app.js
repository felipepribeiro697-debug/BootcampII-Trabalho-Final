// Monta o app Express. Recebe banco e servicos por parametro
// para que os testes possam injetar banco em memoria e APIs falsas (mocks).
const express = require("express");
const path = require("path");
const ticketsRouter = require("./routes/tickets");
const { tecnicosRouter } = require("./routes/cadastros");
const { filiaisRouter, cepRouter } = require("./routes/filiais");
const { criarViaCep } = require("./services/viacep");

// Servico "desligado": usado quando nenhum cliente do GitHub e informado (ex.: nos testes).
const githubDesligado = {
  githubAtivo: () => false,
  criarIssue: async () => {
    throw Object.assign(new Error("Integracao com GitHub desligada."), { status: 400 });
  },
};

function criarApp(db, { github = githubDesligado, viacep = criarViaCep() } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/api/saude", (req, res) => res.json({ ok: true }));
  app.get("/api/config", (req, res) => res.json({ githubAtivo: github.githubAtivo() }));

  app.use("/api/tickets", ticketsRouter(db, github));
  app.use("/api/tecnicos", tecnicosRouter(db));
  app.use("/api/filiais", filiaisRouter(db, viacep));
  app.use("/api/cep", cepRouter(viacep));

  // Handler de erro: respeita err.status (ex.: 400 do express.json com JSON invalido).
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    let erro = "Erro interno do servidor.";
    if (err.type === "entity.parse.failed") erro = "JSON invalido no corpo da requisicao.";
    else if (status < 500) erro = err.message;
    res.status(status).json({ erro });
  });

  return app;
}

module.exports = { criarApp };
