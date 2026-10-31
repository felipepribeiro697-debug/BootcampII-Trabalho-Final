// Monta o app Express. Recebe banco e servicos por parametro
// para que os testes possam injetar banco em memoria e APIs falsas (mocks).
const express = require("express");
const path = require("path");
const ticketsRouter = require("./routes/tickets");
const { tecnicosRouter } = require("./routes/cadastros");

// Integracao com GitHub ainda nao implementada: servico "desligado".
const githubDesligado = {
  githubAtivo: () => false,
  criarIssue: async () => {
    throw Object.assign(new Error("Integracao com GitHub ainda nao implementada."), { status: 400 });
  },
};

function criarApp(db, { github = githubDesligado } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/api/saude", (req, res) => res.json({ ok: true }));
  app.get("/api/config", (req, res) => res.json({ githubAtivo: github.githubAtivo() }));

  app.use("/api/tickets", ticketsRouter(db, github));
  app.use("/api/tecnicos", tecnicosRouter(db));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor." });
  });

  return app;
}

module.exports = { criarApp };
