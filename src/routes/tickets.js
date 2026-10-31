const express = require("express");
const { validarTicket, validarMudancaStatus, ehCritico, calcularSla, PRIORIDADES } = require("../regras");

const SELECT_TICKET = `
  SELECT t.*, tc.nome AS tecnico_nome, f.nome AS filial_nome, f.cidade AS filial_cidade, f.uf AS filial_uf
  FROM tickets t
  LEFT JOIN tecnicos tc ON tc.id = t.tecnico_id
  LEFT JOIN filiais f ON f.id = t.filial_id
`;

module.exports = function ticketsRouter(db, github) {
  const r = express.Router();

  const buscar = (id) => db.prepare(`${SELECT_TICKET} WHERE t.id = ?`).get(id);
  const comSla = (t) => (t ? { ...t, sla: calcularSla(t.prioridade, t.criado_em) } : t);

  // Tenta abrir a issue; falha do GitHub NAO impede o ticket de existir.
  async function tentarIssue(ticket) {
    if (!github.githubAtivo() || !ehCritico(ticket) || ticket.github_issue_url) return { ticket };
    try {
      const url = await github.criarIssue(ticket);
      db.prepare("UPDATE tickets SET github_issue_url = ? WHERE id = ?").run(url, ticket.id);
      return { ticket: buscar(ticket.id) };
    } catch (e) {
      return { ticket, avisoGithub: e.message };
    }
  }

  // Listar (filtros opcionais: ?status=&prioridade=&tecnico_id=)
  r.get("/", (req, res) => {
    const where = [];
    const params = [];
    for (const campo of ["status", "prioridade", "tecnico_id", "categoria"]) {
      if (req.query[campo]) {
        where.push(`t.${campo} = ?`);
        params.push(req.query[campo]);
      }
    }
    const sql = `${SELECT_TICKET} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY t.id DESC`;
    res.json(db.prepare(sql).all(...params).map(comSla));
  });

  r.get("/:id", (req, res) => {
    const t = buscar(req.params.id);
    if (!t) return res.status(404).json({ erro: "Ticket nao encontrado." });
    res.json(comSla(t));
  });

  // Criar
  r.post("/", async (req, res) => {
    const { valido, erros } = validarTicket(req.body);
    if (!valido) return res.status(400).json({ erro: erros.join(" ") });

    const { titulo, descricao = "", categoria, prioridade, tecnico_id = null, filial_id = null } = req.body;
    const info = db
      .prepare(
        "INSERT INTO tickets (titulo, descricao, categoria, prioridade, tecnico_id, filial_id) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(titulo.trim(), descricao, categoria, prioridade, tecnico_id || null, filial_id || null);

    const { ticket, avisoGithub } = await tentarIssue(buscar(info.lastInsertRowid));
    res.status(201).json({ ...comSla(ticket), avisoGithub });
  });

  // Atualizar status / tecnico / prioridade (usado pelo drag-and-drop do Kanban)
  r.patch("/:id", async (req, res) => {
    const atual = buscar(req.params.id);
    if (!atual) return res.status(404).json({ erro: "Ticket nao encontrado." });

    const novo = { ...atual };
    if ("tecnico_id" in req.body) novo.tecnico_id = req.body.tecnico_id || null;
    if ("prioridade" in req.body) {
      if (!PRIORIDADES.includes(req.body.prioridade)) return res.status(400).json({ erro: "Prioridade invalida." });
      novo.prioridade = req.body.prioridade;
    }
    if ("status" in req.body) {
      const erro = validarMudancaStatus(novo, req.body.status);
      if (erro) return res.status(400).json({ erro });
      novo.status = req.body.status;
    }

    db.prepare(
      `UPDATE tickets SET status = ?, tecnico_id = ?, prioridade = ?,
       atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    ).run(novo.status, novo.tecnico_id, novo.prioridade, atual.id);

    // Se a prioridade subiu para critica, tambem vira issue
    const { ticket, avisoGithub } = await tentarIssue(buscar(atual.id));
    res.json({ ...comSla(ticket), avisoGithub });
  });

  // Forcar criacao da issue manualmente
  r.post("/:id/github", async (req, res) => {
    const t = buscar(req.params.id);
    if (!t) return res.status(404).json({ erro: "Ticket nao encontrado." });
    if (t.github_issue_url) return res.json(comSla(t));
    try {
      const url = await github.criarIssue(t);
      db.prepare("UPDATE tickets SET github_issue_url = ? WHERE id = ?").run(url, t.id);
      res.json(comSla(buscar(t.id)));
    } catch (e) {
      res.status(e.status || 500).json({ erro: e.message });
    }
  });

  r.delete("/:id", (req, res) => {
    const info = db.prepare("DELETE FROM tickets WHERE id = ?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ erro: "Ticket nao encontrado." });
    res.status(204).end();
  });

  return r;
};
