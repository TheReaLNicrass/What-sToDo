FROM node:20-alpine

WORKDIR /app

# Copy backend and install dependencies
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy frontend (Express serves it via ../../frontend relative to src/app.js)
COPY frontend/ /app/frontend/

EXPOSE 3000

CMD ["node", "server.js"]
