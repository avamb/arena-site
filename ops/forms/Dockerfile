# Form handler as a container (Node entry of the same Hono app). Pairs with ops/nginx (proxy /api/).
#   docker build -f ops/forms/Dockerfile -t arena-site-forms:local .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY forms ./forms
COPY tsconfig.json ./

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/forms ./forms
COPY --from=build /app/package.json ./
RUN npm install --no-save --ignore-scripts tsx@4 && adduser -D -u 10001 app && chown -R app:app /app
USER app
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "--import", "tsx", "forms/server-node.ts"]
