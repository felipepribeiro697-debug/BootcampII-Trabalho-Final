// Testes unitarios das regras de negocio (funcoes puras).
const {
  normalizarCep,
  formatarCep,
  validarTicket,
  validarMudancaStatus,
  ehCritico,
  calcularSla,
  montarIssue,
} = require("../src/regras");

describe("CEP", () => {
  test("normaliza CEP com mascara", () => {
    expect(normalizarCep("72241-608")).toBe("72241608");
  });

  test("rejeita CEP com quantidade errada de digitos", () => {
    expect(normalizarCep("1234")).toBeNull();
    expect(normalizarCep("")).toBeNull();
    expect(normalizarCep(undefined)).toBeNull();
  });

  test("formata CEP no padrao 00000-000", () => {
    expect(formatarCep("72241608")).toBe("72241-608");
  });
});

describe("validarTicket", () => {
  const valido = { titulo: "Impressora do RH sem toner", categoria: "hardware", prioridade: "media" };

  test("aceita ticket valido", () => {
    expect(validarTicket(valido)).toEqual({ valido: true, erros: [] });
  });

  test("rejeita titulo vazio ou curto", () => {
    const r = validarTicket({ ...valido, titulo: "  pc " });
    expect(r.valido).toBe(false);
    expect(r.erros[0]).toMatch(/titulo/);
  });

  test("rejeita prioridade e categoria fora da lista", () => {
    const r = validarTicket({ ...valido, prioridade: "urgentissima", categoria: "cafe" });
    expect(r.valido).toBe(false);
    expect(r.erros).toHaveLength(2);
  });
});

describe("validarMudancaStatus", () => {
  test("bloqueia mover ticket sem tecnico para 'em_andamento'", () => {
    expect(validarMudancaStatus({ tecnico_id: null }, "em_andamento")).toMatch(/tecnico/);
  });

  test("permite mover ticket com tecnico", () => {
    expect(validarMudancaStatus({ tecnico_id: 1 }, "resolvido")).toBeNull();
  });

  test("rejeita status inexistente", () => {
    expect(validarMudancaStatus({ tecnico_id: 1 }, "arquivado")).toMatch(/Status invalido/);
  });
});

describe("SLA e chamados criticos", () => {
  test("ticket critico tem SLA de 4 horas", () => {
    const criado = "2026-01-01T10:00:00Z";
    const sla = calcularSla("critica", criado, new Date("2026-01-01T11:00:00Z"));
    expect(sla.horasRestantes).toBe(3);
    expect(sla.atrasado).toBe(false);
  });

  test("marca SLA estourado quando passa do prazo", () => {
    const sla = calcularSla("alta", "2026-01-01T10:00:00Z", new Date("2026-01-01T19:00:00Z"));
    expect(sla.atrasado).toBe(true);
  });

  test("somente prioridade critica vira issue", () => {
    expect(ehCritico({ prioridade: "critica" })).toBe(true);
    expect(ehCritico({ prioridade: "alta" })).toBe(false);
  });

  test("monta titulo da issue com numero do ticket", () => {
    const issue = montarIssue({ id: 7, titulo: "Link da filial caiu", categoria: "rede", prioridade: "critica" });
    expect(issue.title).toBe("[HELPDESK #7] Link da filial caiu");
    expect(issue.labels).toContain("critico");
  });
});
