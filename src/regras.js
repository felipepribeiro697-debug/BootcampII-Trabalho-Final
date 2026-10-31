// Regras de negocio do Helpdesk.
// Funcoes PURAS (sem banco, sem rede) -> faceis de testar no Jest.

const STATUS = ["aberto", "em_andamento", "aguardando", "resolvido"];
const PRIORIDADES = ["baixa", "media", "alta", "critica"];
const CATEGORIAS = ["hardware", "rede", "software", "outro"];

// Prazo de atendimento (SLA) em horas, por prioridade
const SLA_HORAS = { critica: 4, alta: 8, media: 24, baixa: 72 };

/** Remove tudo que nao for digito e valida se sobraram 8 digitos. */
function normalizarCep(cep) {
  const digitos = String(cep ?? "").replace(/\D/g, "");
  return digitos.length === 8 ? digitos : null;
}

/** "72241608" -> "72241-608" */
function formatarCep(cep) {
  const n = normalizarCep(cep);
  return n ? `${n.slice(0, 5)}-${n.slice(5)}` : null;
}

/**
 * Valida os dados de criacao de um ticket.
 * Retorna { valido: boolean, erros: string[] }.
 */
function validarTicket(dados) {
  const erros = [];
  const d = dados || {};
  const titulo = typeof d.titulo === "string" ? d.titulo.trim() : "";

  if (titulo.length < 5) erros.push("O titulo deve ter pelo menos 5 caracteres.");
  if (titulo.length > 120) erros.push("O titulo deve ter no maximo 120 caracteres.");
  if (!CATEGORIAS.includes(d.categoria)) erros.push(`Categoria invalida. Use: ${CATEGORIAS.join(", ")}.`);
  if (!PRIORIDADES.includes(d.prioridade)) erros.push(`Prioridade invalida. Use: ${PRIORIDADES.join(", ")}.`);

  return { valido: erros.length === 0, erros };
}

/**
 * Regra de fluxo do Kanban: um ticket so sai de "aberto"
 * se tiver um tecnico responsavel atribuido.
 * Retorna null se a mudanca e permitida, ou a mensagem de erro.
 */
function validarMudancaStatus(ticket, novoStatus) {
  if (!STATUS.includes(novoStatus)) return `Status invalido. Use: ${STATUS.join(", ")}.`;
  if (novoStatus !== "aberto" && !ticket.tecnico_id) {
    return "Atribua um tecnico responsavel antes de mover o ticket.";
  }
  return null;
}

/** Chamado critico vira issue no GitHub (quando a integracao esta ativa). */
function ehCritico(ticket) {
  return ticket?.prioridade === "critica";
}

/**
 * Calcula a situacao do SLA.
 * Retorna { prazo: Date, atrasado: boolean, horasRestantes: number }.
 */
function calcularSla(prioridade, criadoEm, agora = new Date()) {
  const horas = SLA_HORAS[prioridade] ?? SLA_HORAS.media;
  const inicio = new Date(criadoEm);
  const prazo = new Date(inicio.getTime() + horas * 3600 * 1000);
  const horasRestantes = Math.round(((prazo - agora) / 3600000) * 10) / 10;
  return { prazo, atrasado: horasRestantes < 0, horasRestantes };
}

/** Monta titulo e corpo da issue do GitHub a partir do ticket. */
function montarIssue(ticket) {
  return {
    title: `[HELPDESK #${ticket.id}] ${ticket.titulo}`,
    body: [
      `**Chamado critico aberto no Helpdesk**`,
      ``,
      `- Categoria: ${ticket.categoria}`,
      `- Prioridade: ${ticket.prioridade}`,
      `- Filial: ${ticket.filial_nome || "nao informada"}`,
      `- Tecnico: ${ticket.tecnico_nome || "nao atribuido"}`,
      ``,
      ticket.descricao || "_Sem descricao._",
    ].join("\n"),
    labels: ["helpdesk", "critico", ticket.categoria],
  };
}

module.exports = {
  STATUS,
  PRIORIDADES,
  CATEGORIAS,
  SLA_HORAS,
  normalizarCep,
  formatarCep,
  validarTicket,
  validarMudancaStatus,
  ehCritico,
  calcularSla,
  montarIssue,
};
