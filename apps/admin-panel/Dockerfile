FROM node:20-alpine

WORKDIR /app

# Build context: repo root
COPY apps/admin-panel/package.json ./
COPY apps/admin-panel/ ./

RUN npm install

# ✅ Build-time envs required by next.config.mjs (zod)
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL

ARG API_GATEWAY_INTERNAL_URL
ENV API_GATEWAY_INTERNAL_URL=$API_GATEWAY_INTERNAL_URL

RUN npm run build

EXPOSE 3005
CMD ["npm", "run", "start"]