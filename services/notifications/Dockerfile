FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y   && apt-get install -y --no-install-recommends openssl ca-certificates   && rm -rf /var/lib/apt/lists/*

COPY services/notifications/package.json services/notifications/tsconfig.json services/notifications/nest-cli.json services/notifications/jest.config.js ./
COPY services/notifications/prisma ./prisma
COPY services/notifications/src ./src
COPY shared ./shared
COPY services/notifications/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh
RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3007
CMD ["sh","./entrypoint.sh"]
