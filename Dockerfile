# Imagem da aplicacao Helpdesk Kanban
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# 1) Dependencias de producao primeiro (camada reaproveitada se o codigo mudar)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 2) Codigo da aplicacao
COPY src ./src
COPY public ./public

# 3) Pasta do banco SQLite, com dono "node" (a imagem nao roda como root)
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

ENV PORT=3000 \
    DB_PATH=/app/data/helpdesk.db

# Monte um volume aqui para nao perder os chamados ao recriar o container
VOLUME ["/app/data"]
EXPOSE 3000

# O Docker marca o container como "unhealthy" se a API parar de responder
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/saude').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
