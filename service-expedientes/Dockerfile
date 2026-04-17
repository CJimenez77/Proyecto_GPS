FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY package*.json ./

EXPOSE 3002

CMD ["node", "dist/index.js"]