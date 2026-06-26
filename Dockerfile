FROM node:20-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .

RUN npx prisma generate
RUN npm run build
RUN ls -la dist/ && echo "Build OK"

EXPOSE 3000
CMD ["node", "dist/src/main"]
