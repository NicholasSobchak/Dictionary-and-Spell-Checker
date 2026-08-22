# QuickQuill single multi-stage Dockerfile.
#
# Produces two images from the same file via --target:
#   * backend  - Spring Boot JAR + C++ engine libquickquill_engine.so
#   * frontend - nginx serving the built Angular app
#
# Images are built and pushed by .github/workflows/deploy.yml, then pulled on
# the VPS (see compose.prod.yml and scripts/deploy_docker.sh).

### Stage 1: Angular frontend build
FROM node:20-slim AS frontend-build
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

### Stage 2: nginx runtime image (target: frontend)
FROM nginx:stable-alpine AS frontend
COPY nginx/docker.conf /etc/nginx/conf.d/default.conf
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
RUN /src/vcpkg/vcpkg install --triplet x64-linux

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
     -DCMAKE_TOOLCHAIN_FILE=/src/vcpkg/scripts/buildsystems/vcpkg.cmake \
     -DVCPKG_TARGET_TRIPLET=x64-linux \
  && cmake --build build --target quickquill_engine -j$(nproc)

### Stage 4: Spring Boot build
FROM eclipse-temurin:25-jdk AS backend-build
WORKDIR /src
COPY studio/ ./
COPY --from=engine-build /src/build/engine/src/libquickquill_engine.so /src/build/engine/src/libquickquill_engine.so
RUN ./gradlew bootJar

### Stage 5: backend runtime image (target: backend)
FROM eclipse-temurin:25-jre AS backend
WORKDIR /app

COPY --from=backend-build /src/build/libs/*.jar ./app.jar
COPY --from=engine-build /src/build/engine/src/libquickquill_engine.so ./libquickquill_engine.so

EXPOSE 8080
CMD ["java", "--enable-native-access=ALL-UNNAMED", "-Djava.library.path=.", "-jar", "app.jar", "--quickquill.dictionary-path=/app/dictionary.db"]