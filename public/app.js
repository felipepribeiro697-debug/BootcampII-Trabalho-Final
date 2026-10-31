const COLUNAS = [["aberto", "Aberto"], ["em_andamento", "Em andamento"], ["aguardando", "Aguardando peça/terceiro"], ["resolvido", "Resolvido"]];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let tickets = [], tecnicos = [], filiais = [], githubAtivo = false;

async function api(url, opts = {}) {
  const r = await fetch(url, { method: opts.method, headers: { "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const dados = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new Error(dados?.erro || `Erro ${r.status}`);
  return dados;
}

function aviso(msg, erro) {
  const t = $("#aviso");
  t.textContent = msg; t.className = erro ? "erro" : ""; t.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => (t.hidden = true), 4500);
}

// Executa uma ação, avisa o resultado e recarrega o quadro (mesmo em erro, para desfazer o arraste).
async function agir(fn, ok) {
  try { const r = await fn(); if (r?.avisoGithub) aviso("Chamado criado, mas a issue falhou: " + r.avisoGithub, true); else if (ok) aviso(ok); }
  catch (e) { aviso(e.message, true); }
  await carregar();
}

async function carregar() {
  try {
    [tickets, tecnicos, filiais] = await Promise.all([api("/api/tickets"), api("/api/tecnicos"), api("/api/filiais").catch(() => [])]);
  } catch (e) { return aviso("Não foi possível carregar os chamados: " + e.message, true); }
  desenhar();
}

function slaTexto(t) {
  const s = t.sla;
  if (s.encerrado) return s.atrasado ? "Resolvido fora do SLA" : "Resolvido no prazo";
  return s.atrasado ? "SLA estourado" : `${s.horasRestantes}h restantes`;
}

function card(t) {
  const movs = COLUNAS.map(([v, n]) => `<option value="${v}" ${v === t.status ? "selected" : ""}>${n}</option>`).join("");
  const tecs = `<option value="">Sem técnico</option>` + tecnicos.map((x) => `<option value="${x.id}" ${x.id === t.tecnico_id ? "selected" : ""}>${esc(x.nome)}</option>`).join("");
  const issue = t.github_issue_url
    ? `<a href="${esc(t.github_issue_url)}" target="_blank" rel="noopener">Ver issue no GitHub</a>`
    : t.prioridade === "critica" && githubAtivo ? `<button data-gh="${t.id}">Abrir issue no GitHub</button>` : "";
  return `<article class="card p-${t.prioridade}" draggable="true" data-id="${t.id}">
    <header><strong>#${t.id} ${esc(t.titulo)}</strong><button class="x" data-del="${t.id}" title="Excluir chamado" aria-label="Excluir chamado ${t.id}">×</button></header>
    ${t.descricao ? `<p>${esc(t.descricao)}</p>` : ""}
    <div class="tags"><span class="tag">${t.prioridade}</span><span class="tag">${t.categoria}</span>${t.filial_nome ? `<span class="tag">${esc(t.filial_nome)}</span>` : ""}<span class="sla ${t.sla.atrasado ? "atrasado" : ""}">${slaTexto(t)}</span></div>
    <select data-tec="${t.id}" aria-label="Técnico responsável">${tecs}</select>
    <select data-mover="${t.id}" aria-label="Mover para">${movs}</select>
    ${issue}
  </article>`;
}

function desenhar() {
  const f = $("#filtro").value;
  $("#quadro").innerHTML = COLUNAS.map(([s, nome]) => {
    const lista = tickets.filter((t) => t.status === s && (!f || t.prioridade === f));
    return `<section class="col" data-status="${s}"><h2>${nome} <span>${lista.length}</span></h2>${lista.map(card).join("") || '<p class="vazio">Nenhum chamado aqui.</p>'}</section>`;
  }).join("");
  const sel = (lista, vazio, rot) => `<option value="">${vazio}</option>` + lista.map((x) => `<option value="${x.id}">${esc(rot(x))}</option>`).join("");
  const t = $("#f-tec").value, fi = $("#f-fil").value;
  $("#f-tec").innerHTML = sel(tecnicos, "Sem técnico", (x) => x.nome); $("#f-tec").value = t;
  $("#f-fil").innerHTML = sel(filiais, "Sem filial", (x) => x.nome); $("#f-fil").value = fi;
  $("#l-tec").innerHTML = tecnicos.map((x) => `<li><span>${esc(x.nome)} (${esc(x.especialidade)})</span><button data-dtec="${x.id}" aria-label="Remover ${esc(x.nome)}">Remover</button></li>`).join("");
  $("#l-fil").innerHTML = filiais.map((x) => `<li><span>${esc(x.nome)} — ${esc(x.cidade || "")}/${esc(x.uf || "")}</span><button data-dfil="${x.id}" aria-label="Remover ${esc(x.nome)}">Remover</button></li>`).join("");
}

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "filtro") return desenhar();
  if (el.dataset.mover) agir(() => api(`/api/tickets/${el.dataset.mover}`, { method: "PATCH", body: { status: el.value } }));
  else if (el.dataset.tec) agir(() => api(`/api/tickets/${el.dataset.tec}`, { method: "PATCH", body: { tecnico_id: el.value ? Number(el.value) : null } }));
});

document.addEventListener("click", (e) => {
  const d = e.target.dataset;
  if (d.del && confirm("Excluir este chamado?")) agir(() => api(`/api/tickets/${d.del}`, { method: "DELETE" }), "Chamado excluído.");
  else if (d.gh) agir(() => api(`/api/tickets/${d.gh}/github`, { method: "POST" }), "Issue aberta no GitHub.");
  else if (d.dtec && confirm("Remover este técnico?")) agir(() => api(`/api/tecnicos/${d.dtec}`, { method: "DELETE" }), "Técnico removido.");
  else if (d.dfil && confirm("Remover esta filial?")) agir(() => api(`/api/filiais/${d.dfil}`, { method: "DELETE" }), "Filial removida.");
});

// Arrastar e soltar entre as colunas
document.addEventListener("dragstart", (e) => { const c = e.target.closest?.(".card"); if (c) e.dataTransfer.setData("text/plain", c.dataset.id); });
document.addEventListener("dragover", (e) => { if (e.target.closest?.(".col")) e.preventDefault(); });
document.addEventListener("drop", (e) => {
  const col = e.target.closest?.(".col"); if (!col) return;
  e.preventDefault();
  agir(() => api(`/api/tickets/${e.dataTransfer.getData("text/plain")}`, { method: "PATCH", body: { status: col.dataset.status } }));
});

const dados = (form) => Object.fromEntries(new FormData(form));
$("#novo").addEventListener("submit", (e) => {
  e.preventDefault();
  const b = dados(e.target);
  b.tecnico_id = b.tecnico_id ? Number(b.tecnico_id) : null; b.filial_id = b.filial_id ? Number(b.filial_id) : null;
  agir(async () => { const r = await api("/api/tickets", { method: "POST", body: b }); e.target.reset(); return r; }, "Chamado criado.");
});
$("#f-tecnico").addEventListener("submit", (e) => { e.preventDefault(); agir(async () => { await api("/api/tecnicos", { method: "POST", body: dados(e.target) }); e.target.reset(); }, "Técnico adicionado."); });
$("#f-filial").addEventListener("submit", (e) => { e.preventDefault(); agir(async () => { await api("/api/filiais", { method: "POST", body: dados(e.target) }); e.target.reset(); }, "Filial adicionada."); });
$("#abrir-cad").addEventListener("click", () => $("#cad").showModal());
$("#fechar-cad").addEventListener("click", () => $("#cad").close());

(async () => {
  try { githubAtivo = (await api("/api/config")).githubAtivo; } catch { /* segue sem o selo */ }
  const s = $("#github"); s.textContent = githubAtivo ? "GitHub: ativo" : "GitHub: desligado"; s.classList.toggle("on", githubAtivo);
  carregar();
})();
