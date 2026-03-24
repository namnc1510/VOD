FROM node:20-alpine
WORKDIR /app

# Copy the shared package first
COPY shared-core ./shared-core

# Copy the backend project
COPY movie-backend ./movie-backend

# Install dependencies for backend
WORKDIR /app/movie-backend
RUN npm install

EXPOSE 3001
CMD ["npm", "start"]
