// Cliente do ViaCEP (https://viacep.com.br) - nao precisa de chave de API.
// O fetch entra por parametro para os testes usarem uma versao falsa (sem internet).
const { normalizarCep, formatarCep } = require("../regras");

function erroHttp(mensagem, status) {
  return Object.assign(new Error(mensagem), { status });
}

function criarViaCep({ fetchImpl = fetch, baseUrl = "https://viacep.com.br/ws", timeoutMs = 5000 } = {}) {
  return {
    /** Consulta um CEP. Erros trazem .status: 400 (CEP invalido), 404 (nao existe), 502 (ViaCEP fora do ar). */
    async buscar(cep) {
      const digitos = normalizarCep(cep);
      if (!digitos) throw erroHttp("CEP invalido. Informe 8 digitos.", 400);

      let resposta;
      try {
        resposta = await fetchImpl(`${baseUrl}/${digitos}/json/`, { signal: AbortSignal.timeout(timeoutMs) });
      } catch {
        throw erroHttp("Nao foi possivel consultar o ViaCEP agora. Tente novamente.", 502);
      }
      if (!resposta.ok) throw erroHttp("ViaCEP indisponivel no momento.", 502);

      let dados;
      try {
        dados = await resposta.json();
      } catch {
        throw erroHttp("Resposta invalida do ViaCEP.", 502);
      }
      // Para CEP que nao existe o ViaCEP responde 200 com { "erro": true }
      if (dados.erro) throw erroHttp("CEP nao encontrado.", 404);

      return {
        cep: formatarCep(digitos),
        logradouro: dados.logradouro || null,
        bairro: dados.bairro || null,
        cidade: dados.localidade || null,
        uf: dados.uf || null,
      };
    },
  };
}

module.exports = { criarViaCep };
