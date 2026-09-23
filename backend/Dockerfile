# =======================================================
# Dockerfile for Let's Talk (ConnectChat)
# Multi-stage build for optimal image size and security
# =======================================================

# Stage 1: Build JAR with Maven
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper and POM first for dependency caching
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B || true

# Copy application source code (including static frontend in src/main/resources/static)
COPY src src

# Build executable JAR
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Runtime Container
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user and persistent storage directories
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/data /app/uploads && \
    chown -R appuser:appgroup /app

USER appuser

# Copy built JAR from builder stage
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar

# Expose default HTTP port
EXPOSE 8080

# Environment variables
ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE=default \
    JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

# Start Spring Boot application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
