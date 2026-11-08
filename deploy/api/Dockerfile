# Preview image for Render's free plan: the Express API + a local MariaDB in ONE container.
# ⚠️ The database lives inside the container, so all data is wiped whenever the
# service restarts or sleeps. The start script recreates the schema and the seed
# accounts on every boot. Use a real MySQL server for anything beyond previews.
FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends mariadb-server openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
RUN npm ci --workspace=apps/api --workspace=packages/database --workspace=packages/types --include-workspace-root

COPY packages ./packages
COPY apps/api ./apps/api
RUN npx prisma generate --schema packages/database/prisma/schema.prisma \
 && npm run build --workspace=packages/types \
 && npm run build --workspace=packages/database \
 && npm run build --workspace=apps/api

COPY deploy/api/mariadb.cnf /etc/mysql/mariadb.conf.d/99-preview.cnf
COPY deploy/api/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV PORT=10000
EXPOSE 10000
CMD ["/app/start.sh"]
