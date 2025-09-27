# ==============================
# Stage 1: Build the application
# ==============================
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /workspace

# Copy pom.xml and download dependencies (layer caching)
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Copy source code
COPY src src

# Package application (skip tests during image build)
RUN mvn -B package -DskipTests

# ==============================
# Stage 2: Run the application
# ==============================
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app

# Copy JAR from build stage
COPY --from=build /workspace/target/*.jar app.jar

# Let Spring Boot pick up PORT from environment
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
