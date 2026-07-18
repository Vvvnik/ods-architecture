FROM node:20-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20-bookworm-slim
ARG TARGETARCH
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl libicu72 python3 openjdk-17-jdk-headless maven \
  && curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh \
  && bash /tmp/dotnet-install.sh --channel 8.0 --install-dir /usr/share/dotnet \
  && ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet \
  && rm -rf /var/lib/apt/lists/* /tmp/dotnet-install.sh
ENV NODE_ENV=production
ENV DOTNET_ROOT=/usr/share/dotnet
ENV DOTNET_ROLL_FORWARD=LatestMajor
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-${TARGETARCH}
ENV PATH="${PATH}:/usr/share/dotnet:${JAVA_HOME}/bin"
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY parsers/ ./parsers/
RUN cd parsers/typescript && npm ci --omit=dev
RUN cd parsers/compose && npm ci --omit=dev
RUN cd parsers/openapi && npm ci --omit=dev
RUN cd parsers/csharp/Ods.CSharpParser && dotnet build -c Release
RUN cd parsers/dotnet-api-routes/Ods.DotnetApiRoutesParser && dotnet build -c Release
RUN cd parsers/java && mvn -q -DskipTests package
RUN chmod +x parsers/csharp/run.sh parsers/dotnet-api-routes/run.sh parsers/python/run.sh parsers/cpp/run.sh parsers/java/run.sh
EXPOSE 3000
CMD ["node", "dist/main.js"]
