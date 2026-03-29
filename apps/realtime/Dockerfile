FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

COPY packages/*/package.json packages/
COPY apps/*/package.json apps/

RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build --filter=@createflowchart/realtime

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 realtime

COPY --from=builder /app/apps/realtime/dist ./dist
COPY --from=builder /app/apps/realtime/package.json ./package.json

USER realtime

EXPOSE 1234

CMD ["node", "dist/server.js"]
