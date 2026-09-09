# Build Stage
FROM node:24-alpine AS build

WORKDIR /app

COPY ../../ ./

RUN corepack enable && yarn toolchain:check

RUN yarn install --ignore-scripts --frozen-lockfile --modules-folder ./node_modules

ARG SENTRY_DSN
ENV VITE_SENTRY_DSN=$SENTRY_DSN

ARG SENTRY_RELEASE
ENV VITE_SENTRY_RELEASE=$SENTRY_RELEASE

RUN yarn workspace @klurigo/common build && yarn workspace @klurigo/klurigo-web build --mode production

# Production Stage
FROM nginx:alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/packages/klurigo-web/dist /usr/share/nginx/html
COPY --from=build /app/packages/klurigo-web/nginx.conf.template /etc/nginx/nginx.conf.template
COPY --from=build /app/packages/klurigo-web/configure-environment.sh /docker-entrypoint.d/configure-environment.sh

RUN chmod +x /docker-entrypoint.d/configure-environment.sh

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
