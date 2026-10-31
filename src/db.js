// Persistencia: SQLite (arquivo em disco) usando o modulo NATIVO do Node (node:sqlite).
// Nao precisa instalar nem compilar nada -> funciona em qualquer Node >= 22.13.
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tecnicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  especialidade TEXT NOT NULL DEFAULT 'geral'
);

CREATE TABLE IF NOT EXISTS filiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cep TEXT NOT NULL,
  logradouro TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  prioridade TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto',
  tecnico_id INTEGER REFERENCES tecnicos(id) ON DELETE SET NULL,
  filial_id INTEGER REFERENCES filiais(id) ON DELETE SET NULL,
  github_issue_url TEXT,
  resolvido_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

/**
 * Abre (ou cria) o banco. Use ":memory:" nos testes.
 */
function abrirBanco(arquivo = process.env.DB_PATH || path.join(__dirname, "..", "data", "helpdesk.db")) {
  if (arquivo !== ":memory:") fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);
  if (arquivo !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);

  // Migracao: bancos criados antes desta versao nao tem a coluna resolvido_em.
  const colunas = db.prepare("PRAGMA table_info(tickets)").all().map((c) => c.name);
  if (!colunas.includes("resolvido_em")) db.exec("ALTER TABLE tickets ADD COLUMN resolvido_em TEXT");

  return db;
}

/** Insere tecnicos de exemplo se a tabela estiver vazia (primeira execucao). */
function semear(db) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM tecnicos").get();
  if (n > 0) return;
  const ins = db.prepare("INSERT INTO tecnicos (nome, especialidade) VALUES (?, ?)");
  ins.run("Ana Souza", "redes");
  ins.run("Bruno Lima", "hardware");
  ins.run("Carla Dias", "geral");
}

module.exports = { abrirBanco, semear };
