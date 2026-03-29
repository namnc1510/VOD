FROM node:20-alpine AS builder

# Vben Admin requires pnpm 10
RUN npm install -g pnpm@10

WORKDIR /app

# Copy the shared package
COPY shared-core ./shared-core

# Copy the admin project
COPY vue-vben-admin ./vue-vben-admin

WORKDIR /app/vue-vben-admin
# Set max memory limit for Turborepo
ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN pnpm install
RUN pnpm run build:antd

# Setup Nginx for serving SPA
FROM nginx:alpine
COPY --from=builder /app/vue-vben-admin/apps/web-antd/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf && \
    echo "server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
