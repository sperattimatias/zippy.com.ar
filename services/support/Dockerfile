FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y   && apt-get install -y --no-install-recommends openssl ca-certificates   && rm -rf /var/lib/apt/lists/*

COPY services/payment/package.json services/payment/tsconfig.json services/payment/nest-cli.json services/payment/jest.config.js ./
COPY services/payment/prisma ./prisma
COPY services/payment/src ./src
COPY shared ./shared
COPY services/payment/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh
RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3004
CMD ["sh","./entrypoint.sh"]
