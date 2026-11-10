# Build stage: runs the tests and builds a plain Node server
FROM node:24-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --no-audit --no-fund
RUN npm test
RUN NITRO_PRESET=node-server npm run build

# Runtime stage: only the self-contained .output folder, no node_modules needed
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
