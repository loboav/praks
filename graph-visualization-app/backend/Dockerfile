FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/GraphVisualizationApp/GraphVisualizationApp.csproj
RUN dotnet publish src/GraphVisualizationApp/GraphVisualizationApp.csproj -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
COPY wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh
ENTRYPOINT ["/bin/bash", "-c", "/wait-for-db.sh && dotnet GraphVisualizationApp.dll"]