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
    // Nao deixa chamado em atendimento sem responsavel.
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM tickets WHERE tecnico_id = ? AND status IN ('em_andamento', 'aguardando')")
      .get(req.params.id);
    if (n > 0) {
      return res.status(409).json({ erro: `Tecnico possui ${n} chamado(s) em atendimento. Reatribua antes de remover.` });
    }
    const info = db.prepare("DELETE FROM tecnicos WHERE id = ?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ erro: "Tecnico nao encontrado." });
    res.status(204).end();
  });

  return r;
}

module.exports = { tecnicosRouter };
