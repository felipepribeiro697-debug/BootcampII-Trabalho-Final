// Cliente da API de Issues do GitHub (https://docs.github.com/rest/issues/issues#create-an-issue).
// Fica "desligado" (githubAtivo() = false) enquanto GITHUB_TOKEN e GITHUB_REPO nao estiverem definidos.
const { montarIssue } = require("../regras");

function erroHttp(mensagem, status) {
  return Object.assign(new Error(mensagem), { status });
}

function criarGithub({
  token = process.env.GITHUB_TOKEN,
  repo = process.env.GITHUB_REPO,
  fetchImpl = fetch,
  baseUrl = "https://api.github.com",
  timeoutMs = 8000,
} = {}) {
  const tokenLimpo = typeof token === "string" ? token.trim() : "";
  const repoLimpo = typeof repo === "string" ? repo.trim() : "";
  // Formato "usuario/repositorio" (evita montar uma URL estranha a partir da variavel)
  const ativo = Boolean(tokenLimpo) && /^[\w.-]+\/[\w.-]+$/.test(repoLimpo);

  return {
    githubAtivo: () => ativo,

    /** Abre a issue do chamado e devolve a URL dela. Erros trazem .status. */
    async criarIssue(ticket) {
      if (!ativo) {
        throw erroHttp("Integracao com GitHub desligada: defina GITHUB_TOKEN e GITHUB_REPO (usuario/repositorio).", 400);
      }

      let resposta;
      try {
        resposta = await fetchImpl(`${baseUrl}/repos/${repoLimpo}/issues`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenLimpo}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "helpdesk-kanban",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(montarIssue(ticket)),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw erroHttp("Nao foi possivel falar com o GitHub agora.", 502);
      }

      // A mensagem nunca inclui o token.
      if (!resposta.ok) {
        throw erroHttp(
          `GitHub recusou a criacao da issue (HTTP ${resposta.status}). Confira o token e a permissao "Issues".`,
          502
        );
      }
      const dados = await resposta.json();
      return dados.html_url;
    },
  };
}

module.exports = { criarGithub };
