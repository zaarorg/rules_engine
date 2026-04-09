FROM gradle:8.7-jdk21-jammy AS builder
WORKDIR /build
COPY settings.gradle.kts build.gradle.kts ./
COPY gradle/ gradle/
RUN gradle dependencies --no-daemon 2>/dev/null || true
COPY src/ src/
RUN gradle shadowJar --no-daemon -q

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /build/build/libs/app.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
