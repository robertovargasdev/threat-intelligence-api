FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk update && apk add --no-cache dumb-init=1.2.5-r3 && corepack enable

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS dev
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

FROM dev AS build
RUN pnpm run build
RUN pnpm prune --prod

FROM base AS production
ENV NODE_ENV=production
USER node
WORKDIR /app
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["dumb-init", "node", "dist/main.js"]