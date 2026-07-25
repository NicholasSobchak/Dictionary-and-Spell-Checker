# Multi-stage Dockerfile: build the C++ backend inside the image and produce a small runtime image

### Frontend build stage
FROM node:20-slim AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

### Builder stage
FROM debian:bookworm-slim AS builder
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential cmake git ca-certificates curl pkg-config unzip tar zip python3 \
  && rm -rf /var/lib/apt/lists/*

# Install vcpkg and bootstrap (rarely changes)
WORKDIR /src
RUN git clone --depth=1 https://github.com/microsoft/vcpkg.git /src/vcpkg \
  && /src/vcpkg/bootstrap-vcpkg.sh -disableMetrics

# Copy source and install dependencies (cached until vcpkg.json changes)
COPY . /src/
RUN /src/vcpkg/vcpkg install --triplet x64-linux

# Build (invalidated on code changes, but deps layer above is cached)
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
     -DCMAKE_TOOLCHAIN_FILE=/src/vcpkg/scripts/buildsystems/vcpkg.cmake \
     -DVCPKG_TARGET_TRIPLET=x64-linux \
  && cmake --build build -j$(nproc)

### Final runtime image
FROM debian:bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libstdc++6 curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Copy only the built binary and config; do NOT copy dictionary.db (mount at runtime)
COPY --from=builder /src/build/src/dict_crow ./dict_crow
RUN printf '{"database_path":"dictionary.db","server_port":8080,"redis_host":"redis","redis_port":6379}\n' > config.json
COPY --from=frontend /web/dist/browser ./web/dist/browser

EXPOSE 8080
CMD ["./dict_crow"]
