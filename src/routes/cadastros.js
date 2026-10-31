// Rotas de cadastro: tecnicos.
const express = require("express");

function tecnicosRouter(db) {
  const r = express.Router();

  r.get("/", (req, res) => {
    res.json(db.prepare("SELECT * FROM tecnicos ORDER BY nome").all());
  });

  r.post("/", (req, res) => {
    const nome = (req.body?.nome || "").trim();
    const especialidade = (req.body?.especialidade || "geral").trim();
    if (nome.length < 3) return res.status(400).json({ erro: "Nome do tecnico deve ter pelo menos 3 caracteres." });
    const info = db.prepare("INSERT INTO tecnicos (nome, especialidade) VALUES (?, ?)").run(nome, especialidade);
    res.status(201).json(db.prepare("SELECT * FROM tecnicos WHERE id = ?").get(info.lastInsertRowid));
  });

  r.delete("/:id", (req, res) => {
    const info = db.prepare("DELETE FROM tecnicos WHERE id = ?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ erro: "Tecnico nao encontrado." });
    res.status(204).end();
  });

  return r;
}

module.exports = { tecnicosRouter };
