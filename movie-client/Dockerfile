FROM node:20-alpine AS builder
WORKDIR /app

# Copy the shared package
COPY shared-core ./shared-core

# Copy the client project
COPY movie-client ./movie-client

WORKDIR /app/movie-client
RUN npm install
RUN npm run build

# Setup Nginx for serving SPA
FROM nginx:alpine
COPY --from=builder /app/movie-client/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf && \
    echo "server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
