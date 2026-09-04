# Build and run. Maven and the JDK never leave the build stage, so the shipped
# image carries a JRE and one jar.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Dependencies first: this layer is cached until pom.xml changes, so a source
# edit does not re-download the world.
COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app

# Not root. A container process that does not need to write to its own image
# should not be able to.
RUN useradd --system --uid 10001 app
COPY --from=build /app/target/api-spring-1.0.0.jar app.jar

# Created here rather than left to the volume mount, which would otherwise
# arrive owned by root and be unwritable by this user.
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
