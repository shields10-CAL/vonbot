FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
RUN addgroup -S lmc && adduser -S lmc -G lmc
COPY --from=build --chown=lmc:lmc /app/dist ./dist
COPY --from=build --chown=lmc:lmc /app/server ./server
COPY --from=build --chown=lmc:lmc /app/node_modules ./node_modules
COPY --from=build --chown=lmc:lmc /app/package.json ./package.json
USER lmc
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
