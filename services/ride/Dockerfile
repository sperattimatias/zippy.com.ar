FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y   && apt-get install -y --no-install-recommends openssl ca-certificates   && rm -rf /var/lib/apt/lists/*

COPY services/ride/package.json services/ride/tsconfig.json services/ride/nest-cli.json services/ride/jest.config.js ./
COPY services/ride/prisma ./prisma
COPY services/ride/src ./src
COPY shared ./shared
COPY services/ride/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh
RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3002
CMD ["sh","./entrypoint.sh"]
