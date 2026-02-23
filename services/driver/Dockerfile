FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json nest-cli.json jest.config.js ./
COPY prisma ./prisma
COPY src ./src
COPY ../../shared ../../shared
RUN npm install
RUN npx prisma generate
RUN npm run build
EXPOSE 3003
CMD ["npm", "run", "start"]
