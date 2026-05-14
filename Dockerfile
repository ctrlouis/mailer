FROM node:alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json .
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "/app/dist/app.js"]
