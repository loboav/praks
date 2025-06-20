FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["backend/src/GraphVisualizationApp.csproj", "backend/src/"]
RUN dotnet restore "backend/src/GraphVisualizationApp.csproj"
COPY . .
WORKDIR "/src/backend/src"
RUN dotnet build "GraphVisualizationApp.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "GraphVisualizationApp.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GraphVisualizationApp.dll"]