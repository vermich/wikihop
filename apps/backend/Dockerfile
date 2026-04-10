# ─────────────────────────────────────────────────────────────
# Stage 1 : BUILD
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copier les manifestes du monorepo en premier (cache Docker optimal)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Installer toutes les dépendances (dev incluses — nécessaires pour tsc)
RUN npm ci --workspace=apps/backend --workspace=packages/shared --include-workspace-root

# Copier les sources
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Compiler packages/shared en JS (main field pointe vers dist/types/index.js en production)
WORKDIR /app/packages/shared
RUN npm run build

# Compiler le backend (outDir = apps/backend/dist)
WORKDIR /app/apps/backend
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2 : PRODUCTION
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copier les manifestes
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Installer les dépendances de production uniquement
RUN npm ci --workspace=apps/backend --workspace=packages/shared --include-workspace-root --omit=dev

# Copier le dist compilé du backend
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# Copier le dist compilé de packages/shared
# (requis : @wikihop/shared contient du code runtime, main pointe vers dist/types/index.js)
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Cloud Run injecte PORT automatiquement — env.ts le lit via process.env.PORT
# Le défaut dans env.ts est 3000, aligné avec le port exposé ici.
EXPOSE 3000

# Pas de --env-file : les variables sont injectées par Cloud Run depuis Secret Manager
CMD ["node", "apps/backend/dist/server.js"]
