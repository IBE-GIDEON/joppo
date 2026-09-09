# Production image for any container host: Google Cloud Run, Fly.io, Railway,
# Koyeb, or a plain VPS. None of them restrict commercial use the way Vercel's
# Hobby plan does.
#
# Nothing in the application changes. This is the same Node runtime the app
# already runs on, so Prisma, the crawler and the adapters behave identically.

# ---------------------------------------------------------------- deps
FROM node:22-slim AS deps
# Prisma's query engine needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------- build
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The schema is pushed at container start, not here: the database is usually
# unreachable from a build machine, and a build must not depend on it.
RUN npx prisma generate && npx next build

# ---------------------------------------------------------------- run
FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Next's standalone output carries only the server and the modules it traced.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma CLI and schema, so the entrypoint can apply schema changes on start.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# The curated adapter reads these at runtime by absolute path, and standalone
# tracing cannot see a file that is only opened via a computed string.
COPY --from=builder /app/src/scrapers/data ./src/scrapers/data

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
