const { abrirBanco, semear } = require("./db");
const { criarApp } = require("./app");

const PORT = process.env.PORT || 3000;
const db = abrirBanco();
semear(db);

criarApp(db).listen(PORT, () => {
  console.log(`Helpdesk rodando em http://localhost:${PORT}`);
});
