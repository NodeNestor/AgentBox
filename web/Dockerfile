FROM node:22-slim

WORKDIR /app

# Install Docker CLI (to talk to host Docker)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://get.docker.com | sh && \
    rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000 3001
CMD ["sh", "-c", "node auth-terminal-server.js & npm start"]
