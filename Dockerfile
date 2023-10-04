# Install deps
FROM node:18-alpine AS build

RUN apk update && apk add rust cargo

WORKDIR /build
COPY . /build

RUN npm install && cp botconfig.example.ts botconfig.ts
RUN npm run build
RUN cd osuahr && npm install

# Production env
FROM node:18-alpine

WORKDIR /app

COPY --from=build /build/dist/ ./
COPY --from=build /build/node_modules/ ./node_modules/
COPY --from=build /build/osuahr/ ./osuahr/

CMD ["node", "src/app.js"]