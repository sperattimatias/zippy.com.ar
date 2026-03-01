FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y   && apt-get install -y --no-install-recommends openssl ca-certificates   && rm -rf /var/lib/apt/lists/*

COPY services/driver/package.json services/driver/tsconfig.json services/driver/nest-cli.json services/driver/jest.config.js ./
COPY services/driver/prisma ./prisma
COPY services/driver/src ./src
COPY shared ./shared
COPY services/driver/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh
RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3003
CMD ["sh","./entrypoint.sh"]
