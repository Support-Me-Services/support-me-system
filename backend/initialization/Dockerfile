# Minimal multi-stage build for the `initialization` service.
# Build context is expected to be the repo's `backend/` directory, e.g.:
#   docker build -f initialization/Dockerfile -t supportme/initialization .
# (this is how the root docker-compose.yml invokes it)

# This build stage transitively builds proto-contracts (via -am), which shells out to the
# `buf` CLI in its generate-sources phase (buf.gen.yaml uses buf's remote BSR plugins, so no
# local protoc/protoc-gen-grpc-java is needed here - only network access to buf.build).
FROM maven:3.9-eclipse-temurin-25 AS build
RUN curl -sL -o /usr/local/bin/buf \
        https://github.com/bufbuild/buf/releases/download/v1.72.0/buf-Linux-x86_64 \
    && chmod +x /usr/local/bin/buf
WORKDIR /workspace
COPY . .
RUN mvn -pl initialization -am package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /workspace/initialization/target/initialization.jar app.jar
EXPOSE 9092
ENTRYPOINT ["java", "-jar", "app.jar"]
