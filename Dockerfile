FROM node:22-alpine
WORKDIR /repo

# Werkzeuge, falls better-sqlite3 für musl neu kompiliert werden muss.
RUN apk add --no-cache python3 make g++

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV TZ=Europe/Berlin

# Zur Laufzeit ohne root: schreiben nur ins Daten-Volume und in den Next-Cache.
RUN mkdir -p /data && chown -R node:node /data /repo/.next
USER node

EXPOSE 3000
# Migrationen + erster Benutzer laufen beim Start (src/instrumentation.ts).
CMD ["node_modules/.bin/next", "start"]
