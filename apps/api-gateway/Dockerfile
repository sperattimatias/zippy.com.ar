FROM node:20-alpine

WORKDIR /app

# The build context for this Dockerfile is the repository root.
COPY apps/api-gateway/package.json apps/api-gateway/tsconfig.json apps/api-gateway/nest-cli.json ./
COPY apps/api-gateway/src ./src

# Shared workspace code used across services
COPY shared ./shared

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
