# Multi-stage build for the pnpm workspace. One image runs the Express server,
# which also serves the built React app from apps/web/dist.

# --- deps: install all workspace deps once (cached on lockfile) ---
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# --- build: compile shared + server + web ---
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# Vite inlines VITE_* env at build time. Railway passes service variables as
# build args, so declare it here and expose it to the web build. (Publishable
# key = public; safe to bake into the client bundle. Stays in this stage only.)
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @commonality/shared build \
 && pnpm --filter server build \
 && pnpm --filter web build

# --- runtime: prod deps + built output ---
FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
EXPOSE 8080
CMD ["node", "apps/server/dist/index.js"]
