# Build Stage
FROM node:24-alpine AS build

WORKDIR /app

COPY ../../ ./

RUN corepack enable && yarn toolchain:check

RUN yarn install --ignore-scripts --frozen-lockfile --modules-folder ./node_modules

RUN yarn workspace @klurigo/klurigo-service build

# Optimize Stage
FROM node:24-alpine AS optimize

WORKDIR /app

# Copy only necessary files
COPY --from=build /app/package.json /app/yarn.lock ./

# Copy node_modules directly, bypassing workspace issues
COPY --from=build /app/node_modules ./node_modules

# Replace symlink with the actual files for @klurigo/common
RUN rm -rf ./node_modules/@klurigo/common
COPY --from=build /app/packages/common ./node_modules/@klurigo/common

# Copy klurigo-service files
COPY --from=build /app/packages/klurigo-service/package.json ./packages/klurigo-service/package.json
COPY --from=build /app/packages/klurigo-service/.env.production ./packages/klurigo-service/.env.production
COPY --from=build /app/packages/klurigo-service/dist ./packages/klurigo-service/dist

# Production Stage
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

ARG SENTRY_DSN
ENV SENTRY_DSN=$SENTRY_DSN

ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=${SENTRY_RELEASE}

COPY --from=optimize /app/package.json ./package.json
COPY --from=optimize /app/packages/klurigo-service ./packages/klurigo-service
COPY --from=optimize /app/node_modules ./node_modules

WORKDIR /app/packages/klurigo-service

RUN corepack enable && yarn --version

CMD ["yarn", "serve"]

EXPOSE 8080
