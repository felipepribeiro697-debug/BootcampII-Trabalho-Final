// No Express 4, erro lancado dentro de handler async NAO chega ao middleware de erro
// (vira uma Promise rejeitada e pode derrubar o processo). Este wrapper encaminha
// o erro para next(), onde o handler de erro do app.js responde com JSON.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };
