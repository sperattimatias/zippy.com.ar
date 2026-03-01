FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y   && apt-get install -y --no-install-recommends openssl ca-certificates   && rm -rf /var/lib/apt/lists/*

COPY services/auth/package.json services/auth/tsconfig.json services/auth/nest-cli.json services/auth/jest.config.js ./
COPY services/auth/prisma ./prisma
COPY services/auth/src ./src
COPY shared ./shared
COPY services/auth/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh
RUN npm install
RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["sh","./entrypoint.sh"]
