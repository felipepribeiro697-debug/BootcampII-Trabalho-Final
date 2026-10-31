// Rotas de filiais (cadastro com nome + CEP; o endereco vem do ViaCEP) e consulta de CEP.
const express = require("express");
const { asyncHandler } = require("../asyncHandler");
const { normalizarCep } = require("../regras");

// O handler global esconde a mensagem de erros 5xx; aqui o usuario precisa saber
// que o problema foi o ViaCEP (502), entao respondemos direto.
function responderErro(res, e) {
  return res.status(e.status || 502).json({ erro: e.message });
}

function filiaisRouter(db, viacep) {
  const r = express.Router();

  r.get("/", (req, res) => {
    res.json(db.prepare("SELECT * FROM filiais ORDER BY nome").all());
  });

  r.post(
    "/",
    asyncHandler(async (req, res) => {
      const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
      if (nome.length < 3) return res.status(400).json({ erro: "Nome da filial deve ter pelo menos 3 caracteres." });
      if (!normalizarCep(req.body?.cep)) return res.status(400).json({ erro: "CEP invalido. Informe 8 digitos." });

      let endereco;
      try {
        endereco = await viacep.buscar(req.body.cep);
      } catch (e) {
        return responderErro(res, e);
      }

      const info = db
        .prepare("INSERT INTO filiais (nome, cep, logradouro, bairro, cidade, uf) VALUES (?, ?, ?, ?, ?, ?)")
        .run(nome, endereco.cep, endereco.logradouro, endereco.bairro, endereco.cidade, endereco.uf);
      res.status(201).json(db.prepare("SELECT * FROM filiais WHERE id = ?").get(info.lastInsertRowid));
    })
  );

  r.delete("/:id", (req, res) => {
    const info = db.prepare("DELETE FROM filiais WHERE id = ?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ erro: "Filial nao encontrada." });
    res.status(204).end();
  });

  return r;
}

function cepRouter(viacep) {
  const r = express.Router();

  r.get(
    "/:cep",
    asyncHandler(async (req, res) => {
      try {
        res.json(await viacep.buscar(req.params.cep));
      } catch (e) {
        responderErro(res, e);
      }
    })
  );

  return r;
}

module.exports = { filiaisRouter, cepRouter };
