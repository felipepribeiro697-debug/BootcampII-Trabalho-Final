// Clientes do ViaCEP e do GitHub com fetch falso: nenhum teste depende de internet.
const { criarViaCep } = require("../src/services/viacep");
const { criarGithub } = require("../src/services/github");

const resposta = (corpo, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => corpo });

describe("ViaCEP", () => {
  test("normaliza o CEP, chama a URL certa e converte os campos", async () => {
    const fetchImpl = jest.fn(async () =>
      resposta({ logradouro: "Rua X", bairro: "Centro", localidade: "Brasilia", uf: "DF" })
    );
    const dados = await criarViaCep({ fetchImpl }).buscar("72241-608");

    expect(fetchImpl.mock.calls[0][0]).toBe("https://viacep.com.br/ws/72241608/json/");
    expect(dados).toEqual({ cep: "72241-608", logradouro: "Rua X", bairro: "Centro", cidade: "Brasilia", uf: "DF" });
  });

  test("CEP que nao existe (erro: true) vira 404", async () => {
    const fetchImpl = jest.fn(async () => resposta({ erro: true }));
    await expect(criarViaCep({ fetchImpl }).buscar("00000000")).rejects.toMatchObject({ status: 404 });
  });

  test("CEP invalido vira 400 e nem chama a rede", async () => {
    const fetchImpl = jest.fn();
    await expect(criarViaCep({ fetchImpl }).buscar("abc")).rejects.toMatchObject({ status: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("falha de rede vira 502", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error("sem internet");
    });
    await expect(criarViaCep({ fetchImpl }).buscar("72241608")).rejects.toMatchObject({ status: 502 });
  });
});

describe("GitHub Issues", () => {
  test("fica desligado sem token e recusa criar issue", async () => {
    const github = criarGithub({ token: "", repo: "usuario/repo" });
    expect(github.githubAtivo()).toBe(false);
    await expect(github.criarIssue({ id: 1, titulo: "x" })).rejects.toMatchObject({ status: 400 });
  });

  test("repositorio em formato invalido deixa a integracao desligada", () => {
    expect(criarGithub({ token: "segredo", repo: "so-o-nome" }).githubAtivo()).toBe(false);
  });

  test("cria a issue com os headers certos e devolve a URL", async () => {
    const fetchImpl = jest.fn(async () => resposta({ html_url: "https://github.com/usuario/repo/issues/9" }, { status: 201 }));
    const github = criarGithub({ token: "segredo", repo: "usuario/repo", fetchImpl });
    const ticket = { id: 7, titulo: "Servidor fora do ar", categoria: "hardware", prioridade: "critica" };

    expect(github.githubAtivo()).toBe(true);
    await expect(github.criarIssue(ticket)).resolves.toBe("https://github.com/usuario/repo/issues/9");

    const [url, opcoes] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/usuario/repo/issues");
    expect(opcoes.method).toBe("POST");
    expect(opcoes.headers.Authorization).toBe("Bearer segredo");
    expect(JSON.parse(opcoes.body).title).toContain("[HELPDESK #7]");
  });

  test("GitHub recusando vira 502 e a mensagem nao vaza o token", async () => {
    const fetchImpl = jest.fn(async () => resposta({}, { ok: false, status: 401 }));
    const github = criarGithub({ token: "segredo", repo: "usuario/repo", fetchImpl });

    const erro = await github.criarIssue({ id: 1, titulo: "x", categoria: "rede", prioridade: "critica" }).catch((e) => e);
    expect(erro.status).toBe(502);
    expect(erro.message).not.toContain("segredo");
  });
});
