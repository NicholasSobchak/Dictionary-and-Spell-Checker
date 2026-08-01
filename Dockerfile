# Multi-stage Dockerfile: build C++ engine + Spring Boot JAR + Angular frontend

### Frontend build stage
FROM node:20-slim AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

### C++ engine build stage
FROM debian:bookworm-slim AS engine
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential cmake git ca-certificates curl pkg-config unzip tar zip python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth=1 https://github.com/microsoft/vcpkg.git /src/vcpkg \
  && /src/vcpkg/bootstrap-vcpkg.sh -disableMetrics

COPY . /src/
RUN /src/vcpkg/vcpkg install --triplet x64-linux

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
     -DCMAKE_TOOLCHAIN_FILE=/src/vcpkg/scripts/buildsystems/vcpkg.cmake \
     -DVCPKG_TARGET_TRIPLET=x64-linux \
  && cmake --build build --target quickquill_engine -j$(nproc)

### Spring Boot build stage
FROM eclipse-temurin:22-jdk AS backend
WORKDIR /src
COPY studio/ ./
COPY --from=engine /src/build/engine/src/libquickquill_engine.so /src/build/engine/src/libquickquill_engine.so
RUN ./gradlew bootJar

### Final runtime image
FROM eclipse-temurin:22-jre
WORKDIR /app

COPY --from=backend /src/build/libs/*.jar ./app.jar
COPY --from=engine /src/build/engine/src/libquickquill_engine.so ./libquickquill_engine.so
COPY --from=frontend /web/dist/browser ./web/dist/browser

EXPOSE 8080
CMD ["java", "--enable-native-access=ALL-UNNAMED", "-Djava.library.path=.", "-jar", "app.jar", "--quickquill.dictionary-path=/app/dictionary.db"]
