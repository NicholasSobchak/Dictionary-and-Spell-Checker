# QuickQuill single multi-stage Dockerfile.
#
# Produces two images from the same file via --target:
#   * backend  - Spring Boot JAR + C++ engine libquickquill_engine.so
#   * frontend - nginx serving the built Angular app
#
# Consumed by:
#   * the self-hosted stack (scripts/deploy_docker.sh + compose.prod.yml), and
#   * managed platforms (e.g. Render) building directly from this repo.

### Stage 1: Angular frontend build
FROM node:20-slim AS frontend-build
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

### Stage 2: nginx runtime image (target: frontend)
FROM nginx:stable-alpine AS frontend
# Self-hosted stack: docker.conf is active (TLS at the container, certs bind
# mounted by compose.prod.yml).
COPY nginx/docker.conf /etc/nginx/conf.d/default.conf
# Render: render.conf is kept as an inert template. Render TLS-terminates at
# the edge, so the container serves plain HTTP:80; its start command envsubst's
# this template (BACKEND_URL) into the active conf.
COPY nginx/render.conf /etc/nginx/conf.d/default.conf.template
COPY --from=frontend-build /web/dist/browser /usr/share/nginx/html

EXPOSE 80 443

### Stage 3: C++ engine build
FROM debian:bookworm-slim AS engine-build
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential cmake git ca-certificates curl pkg-config unzip tar zip python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src
# Pin vcpkg to the same revision CI uses for reproducible builds.
RUN git clone --depth=1 --branch 2025.04.09 https://github.com/microsoft/vcpkg.git /src/vcpkg \
  && /src/vcpkg/bootstrap-vcpkg.sh -disableMetrics

COPY . /src/
RUN cd /src/engine && /src/vcpkg/vcpkg install --triplet x64-linux

RUN cmake -S /src/engine -B /src/engine/build -DCMAKE_BUILD_TYPE=Release \
     -DCMAKE_TOOLCHAIN_FILE=/src/vcpkg/scripts/buildsystems/vcpkg.cmake \
     -DVCPKG_TARGET_TRIPLET=x64-linux \
  && cmake --build /src/engine/build --target quickquill_engine -j$(nproc)

### Stage 4: Spring Boot build
FROM eclipse-temurin:25-jdk AS backend-build
WORKDIR /src
COPY studio/ ./
COPY --from=engine-build /src/engine/build/src/libquickquill_engine.so /src/engine/build/src/libquickquill_engine.so
RUN ./gradlew bootJar

### Stage 5: backend runtime image (target: backend)
FROM eclipse-temurin:25-jre AS backend
WORKDIR /app

COPY --from=backend-build /src/build/libs/*.jar ./app.jar
COPY --from=engine-build /src/engine/build/src/libquickquill_engine.so ./libquickquill_engine.so
# Bake the dictionary into the image when it is present in the build context
# (local/VPS builds that have dictionary.db). It is gitignored and may be absent
# on platforms like Render that build from the repo alone; there, provide it at
# runtime via a mounted Render Disk and point QUICKQUILL_DICTIONARY_PATH at it.
# The glob keeps the build green in both cases.
COPY dictionary.db* ./

EXPOSE 8080
# The dictionary path is left to the QUICKQUILL_DICTIONARY_PATH env var (with a
# Docker default supplied via ENV below) so managed platforms like Render can
# override it without a code change.
ENV QUICKQUILL_DICTIONARY_PATH=/app/dictionary.db
CMD ["java", "--enable-native-access=ALL-UNNAMED", "-Djava.library.path=.", "-jar", "app.jar"]