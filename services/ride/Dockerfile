FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm install
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "start"]
