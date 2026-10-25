# relay-gateway — a production image.
#
# One process, one SQLite file (or a remote Turso database), nothing else.
# Build:  docker build -t relay-gateway .
# Run:    docker run -p 8787:8787 --env-file relay.env -v relay-data:/data relay-gateway

FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first, so a source change does not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── the runtime image ──────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

# `libsql` is the native client used when the database is remote. It is
# optional: without RELAY_DATABASE_URL the app uses node:sqlite and never
# loads it.
RUN apk add --no-cache tini

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV RELAY_HOST=0.0.0.0
ENV RELAY_PORT=8787
ENV RELAY_DATA_DIR=/data
EXPOSE 8787
VOLUME ["/data"]

# tini reaps zombies and forwards signals, so SIGTERM shuts the server down
# cleanly and the database is closed properly.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/cli.js", "serve"]
