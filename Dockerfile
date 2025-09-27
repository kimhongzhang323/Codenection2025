# ---------- Build stage ----------
FROM maven:3.9.4-eclipse-temurin-17 AS build

WORKDIR /app

# copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn -B dependency:go-offline

# copy the rest of the source
COPY src ./src

# build the app (with Spring Boot repackage)
RUN mvn -B clean package -DskipTests

# ---------- Runtime stage ----------
FROM eclipse-temurin:17-jdk AS runtime

WORKDIR /app

# copy only the fat jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Render provides PORT env var → Spring Boot respects it automatically
EXPOSE 8080

ENTRYPOINT ["java","-jar","/app/app.jar"]
