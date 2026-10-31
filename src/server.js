// Le o arquivo .env (se existir) sem sobrescrever variaveis ja definidas no ambiente.
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue so com as variaveis do ambiente
}

const { abrirBanco, semear } = require("./db");
const { criarApp } = require("./app");
const { criarGithub } = require("./services/github");

const PORT = process.env.PORT || 3000;
const db = abrirBanco();
semear(db);

const github = criarGithub();

criarApp(db, { github }).listen(PORT, () => {
  console.log(`Helpdesk rodando em http://localhost:${PORT}`);
  console.log(`Integracao com GitHub: ${github.githubAtivo() ? "ativa" : "desligada (defina GITHUB_TOKEN e GITHUB_REPO)"}`);
});
