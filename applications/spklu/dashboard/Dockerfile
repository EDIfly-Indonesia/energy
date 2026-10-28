# --- build stage ---
FROM oven/bun:1 AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build

# --- runtime stage ---
FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./server.ts
EXPOSE 5173
CMD ["bun", "server.ts"]
