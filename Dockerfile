# ==============================
# Stage 1: Build the application
# ==============================
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /workspace

# Copy Maven wrapper and config first (for caching dependencies)
COPY pom.xml mvnw ./
COPY .mvn .mvn

# Download dependencies (cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Package application (skip tests in container build)
RUN ./mvnw package -DskipTests

# ==============================
# Stage 2: Run the application
# ==============================
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app

# Copy built JAR from build stage
COPY --from=build /workspace/target/*.jar app.jar

# Render provides PORT as env var (e.g. 10000).
# Spring Boot will use it if application.yml has server.port=${PORT:8080}
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
