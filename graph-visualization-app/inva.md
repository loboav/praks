# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This is a full-stack graph visualization application for directed graphs:
- **Backend**: .NET 8 Web API with Entity Framework Core and PostgreSQL, plus JWT-based authentication, caching, full-text search, and import/export utilities.
- **Frontend**: React + TypeScript single-page app that renders and edits graphs using React Flow and talks to the backend API.
- **Database**: PostgreSQL, initialized either by Docker and EF Core migrations/seeding or manually via `db/init.sql`.
- **Runtime orchestration**: `docker-compose.yml` wires `backend`, `frontend`, and `db` services together.

The top-level layout under `graph-visualization-app/` is:
- `backend/` – .NET Web API, EF Core models/migrations, business logic, auth, search, import/export.
- `frontend/` – React + TypeScript SPA using React Flow and custom hooks.
- `db/` – PostgreSQL schema initialization SQL.
- `docker-compose.yml` – Docker-first workflow entrypoint.

The **root `README.md` strongly favors a Docker-only workflow** for building and running both frontend and backend; local builds are optional.

## Common commands

All commands assume the working directory is `graph-visualization-app/` unless noted.

### Docker-first workflow (recommended)

Build and start the full stack (API + frontend + Postgres):
- Build images (fresh build, no cache):
  - `docker-compose build --no-cache`
- Start all services in the background:
  - `docker-compose up -d`
- Follow logs for all services:
  - `docker-compose logs -f`
- Stop and remove containers (data volume preserved):
  - `docker-compose down`

Default ports and environment bindings (from `docker-compose.yml`):
- Backend HTTP API: `${API_PORT:-5000}` mapped to container port `80` → typically `http://localhost:5000`.
- Frontend: `${FRONTEND_PORT:-3000}` mapped to container port `80` → typically `http://localhost:3000`.
- Note: When running locally with Vite (without Docker), the default port is `5173`.
- PostgreSQL: `5432:5432` (configure via `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).
- The backend connection string is passed via `DB_CONNECTION_STRING` → `ConnectionStrings__DefaultConnection`.
- Frontend uses `REACT_APP_API_URL` to know where the API lives.

### Backend (.NET 8 API) without Docker

Location: `backend/`, primary project: `backend/src/GraphVisualizationApp/GraphVisualizationApp.csproj`.

Restore and build the backend:
- `dotnet restore backend/src/GraphVisualizationApp/GraphVisualizationApp.csproj`
- `dotnet build backend/src/GraphVisualizationApp/GraphVisualizationApp.csproj`

Run the API locally (uses `appsettings.json` or environment for DB connection):
- `dotnet run --project backend/src/GraphVisualizationApp/GraphVisualizationApp.csproj`

Notes:
- `Program.cs` applies EF Core migrations and seeds data on startup via `DatabaseSeeder.SeedAsync`, using `ConnectionStrings:DefaultConnection` and `Seeding:*` settings.
- Update `backend/appsettings.json` or the equivalent environment variables if you run against a local Postgres instance instead of the Docker `db` service.

### Frontend (React + TypeScript) without Docker

Location: `frontend/` (Create React App style setup using `react-scripts`).

Install dependencies and run the dev server:
- `cd frontend`
- Install dependencies:
  - `npm install`
- Start the development server (default `http://localhost:5173`):
  - `npm run dev`

Build a production bundle (if you need a static build outside Docker):
- `npm run build`

The frontend expects the API base URL in `REACT_APP_API_URL` (Docker sets this; when running locally you may need to set it in your environment or `.env` file to match the backend URL, e.g. `http://localhost:5000`).

### Tests and linting

There is no dedicated backend test project or lint configuration checked into this repo at the time of writing.

Frontend tests (Create React App defaults):
- Run the interactive Jest test runner:
  - From `frontend/`: `npm test`
- Run a **single test file or test suite** by pattern:
  - `npm test -- <pattern>`
  - Example: `npm test -- GraphView` (runs tests whose file names or test names match `GraphView`).

Static checks:
- TypeScript is configured via `frontend/tsconfig.json` and is enforced by `react-scripts` on build and test; there is no explicit `npm run lint` script defined in `package.json`.

### Database setup without Docker

If you are not using Docker for Postgres:
- Create a PostgreSQL database and user.
- Apply schema via `db/init.sql` (matches the backend EF model).
- Point `ConnectionStrings:DefaultConnection` in `backend/appsettings.json` (or its environment overrides) at that database.
- On first backend run, EF Core migrations and `DatabaseSeeder` will run automatically.

## Architecture overview

### High-level system design

The application is organized as a typical three-service stack:
- **`db` service (Postgres)** – stores graph structure, object and relation properties, saved layouts, and user/auth data.
- **`backend` service (.NET 8 Web API)** – encapsulates domain logic (graph CRUD, pathfinding, search, analytics, import/export, auth) and exposes a JSON HTTP API.
- **`frontend` service (React/TS)** – renders the graph, handles user interactions (editing, filtering, search, analytics, layouts), and calls the backend API.

The backend uses EF Core to map domain models to the relational schema and exposes DTOs optimized for the frontend. The frontend keeps in-memory graph state synchronized with the backend, including node positions for layout persistence.

### Backend architecture

Key namespaces live under `backend/src/`:

- **Entry point and composition**
  - `GraphVisualizationApp/Program.cs` is the main entrypoint. It:
    - Registers controllers, Swagger/OpenAPI, CORS, memory caching, health checks, and FluentValidation.
    - Binds strongly typed configuration objects (`CacheSettings`, `ApiSettings`, `JwtSettings`) from configuration sections.
    - Configures EF Core with `GraphDbContext` and Npgsql using the `DefaultConnection` string.
    - Enables JWT bearer authentication and role-based authorization.
    - Adds response compression and custom middleware.
    - On startup, applies pending EF Core migrations and calls `DatabaseSeeder.SeedAsync` to populate initial data.

- **Persistence layer**
  - `GraphDbContext` defines the DbSets for graph entities (`ObjectType`, `RelationType`, `GraphObject`, `GraphRelation`, their properties, layouts, and users) and configures cascading behavior between objects and relations.
  - EF Core migrations live under `GraphVisualizationApp/Migrations/` and are used by `Database.Migrate()` at startup.

- **Domain and DTO models**
  - `Models/GraphModels.cs`, `Models/GraphDtos.cs`, `Models/AnalyticsDtos.cs`, `Models/AuthDtos.cs`, `Models/SearchModels.cs`, etc. separate persistence entities from API-level DTOs.
  - `ApplicationSettings` and related types bind configuration sections for caching and API behavior.

- **Core services (business logic)**
  - `Services/GraphService.cs` is the main domain service:
    - Provides CRUD operations for object and relation types, graph objects, relations, and their properties.
    - Uses `IMemoryCache` with `CacheSettings` to cache lists of objects, relations, and type metadata (`graph_objects`, `graph_relations`, `object_types`, `relation_types`).
    - Implements pathfinding:
      - A breadth-first `FindPathAsync` over `GraphRelations` returning node sequences.
      - Dijkstra-based weighted shortest path via `DijkstraPathFinder` (`FindShortestPathDijkstraAsync`) using relation properties (e.g. `weight`) as edge weights.
    - Manages graph layouts via `GetLayoutAsync`/`SaveLayoutAsync`, where layouts are stored in the database (`GraphLayouts`) and keyed by graph/user.
    - Exposes mapping helpers (`ToDto`) to convert EF entities to lightweight DTOs used by the API.
    - Contains batch update operations for objects and relations that can overwrite properties sets in bulk.
  - `Services/ImportService.cs` and the corresponding export service manage JSON and GraphML import/export:
    - Support multiple JSON formats (`objects`/`relations` and `nodes`/`edges`).
    - Maintain ID remapping maps for types, objects, and relations during import.
    - Create or reuse compatible `ObjectType`/`RelationType` entries and populate `GraphObject`/`GraphRelation` tables including key-value properties.
    - For GraphML, automatically create default types and import `node`/`edge` attributes as properties.
    - Clear relevant caches (`graph_objects`, `graph_relations`, type caches) after import.
  - `Services/AnalyticsService.cs` (not detailed here) provides higher-level metrics consumed by the frontend `AnalyticsDashboard`.
  - `Services/AuthService.cs` encapsulates user management and JWT token creation for the auth endpoints.

- **Search subsystem**
  - `Controllers/SearchController.cs` exposes full-text search endpoints under `/api/search`:
    - `POST /api/search` – combined search across objects and relations using a rich `SearchOptions` payload.
    - `POST /api/search/objects` and `/api/search/relations` – object-only or relation-only searches.
    - `GET /api/search` – quick search variant with query params (`q`, `limit`, `fuzzy`).
  - `GraphService` implements `SearchAsync`, `SearchObjectsAsync`, and `SearchRelationsAsync`:
    - Loads entities and their types/properties via EF Core with necessary includes.
    - Applies filters from `SearchOptions` (e.g., by object or relation type IDs, where to search, min relevance, max results).
    - Computes relevance scores and `SearchMatch` details for names, properties, and type descriptions.
    - Uses `Algorithms/FuzzyMatcher` for fuzzy matching, regex, whole-word, and case sensitivity options.

- **HTTP API surface**
  - `Controllers/GraphController.cs` is the primary graph API surface (`[Route("api")]`, mostly under `/api`):
    - Dijkstra path endpoint: `GET /api/dijkstra-path?fromId={fromId}&toId={toId}` returns node IDs, edge IDs, and total weight, with `404` error detail if nodes or path are missing.
    - Graph data: `GET /api/graph` returns `{ Objects, Relations }` snapshot used to render the graph.
    - CRUD for objects and relations, including:
      - Object types: `GET/POST/DELETE /api/object-types`.
      - Relation types: `GET/POST/DELETE /api/relation-types`.
      - Objects: `GET /api/objects`, `POST /api/objects`, `PUT /api/objects/{id}`, `DELETE /api/objects/{id}`.
      - Relations: `GET /api/relations`, `POST /api/relations`, `PUT /api/relations/{id}`, `DELETE /api/relations/{id}`.
      - Property endpoints: `GET/POST /api/object-properties`, `GET/POST /api/relation-properties`.
    - Batch update endpoints for objects and relations: `POST /api/objects/batch-update`, `POST /api/relations/batch-update`.
    - Many endpoints are role-protected with `[Authorize(Roles = "Editor,Admin")]` or `[Authorize(Roles = "Admin")]`, while some (e.g., `GET /api/graph`, object and relation type listings) are `[AllowAnonymous]`.
  - Additional controllers such as `AuthController`, `AnalyticsController`, `SearchController`, `LayoutController`, `ObjectTypeController`, `RelationTypeController`, `UsersController` further structure the API into areas, but most graph operations flow through `GraphController` and `SearchController`.

- **Middleware and validation**
  - `Middleware/ExceptionHandlingMiddleware.cs` centralizes exception handling into structured JSON error responses, mapping common .NET exceptions to HTTP status codes (400, 401, 404, 409, 500) and logging with `ILogger`.
  - `Middleware/ValidationExceptionMiddleware.cs` works with FluentValidation to surface validation errors consistently before they hit the generic exception handler.
  - FluentValidation is wired in `Program.cs` and validators live under `Validators/` (e.g., `PathFindingValidator`, `SearchOptionsValidator`, various object/relation validators). `Helpers/ValidationHelper.cs` contains shared logic for building validation responses.

- **Auth and security**
  - JWT settings (`JwtSettings`) are read from configuration and wired to `JwtBearerOptions` in `Program.cs`.
  - `Users` and `UserRole` entities are part of the model; `AuthService` and `AuthController` handle login, token issuance, and the `/api/auth/me` endpoint the frontend uses to hydrate `AuthContext`.
  - CORS policy `AllowFrontend` is configured using `CorsOrigins` config (defaults to `http://localhost:3000` if not set) and applied before auth middleware.

### Frontend architecture

Frontend code lives under `frontend/src/` and is structured around React components, hooks, and a small typed API surface.

- **Domain types and API client**
  - `types/graph.ts` defines the frontend domain model:
    - `ObjectType`, `RelationType`, `GraphObject`, `GraphRelation` with fields that mirror backend DTOs (IDs, type references, key-value `properties`, optional color/icon, and `PositionX`/`PositionY`).
  - `utils/apiClient.ts` is a thin fetch wrapper that automatically adds the `Authorization: Bearer <token>` header using `localStorage.auth_token` and exposes `get/post/put/delete` helpers.

- **Authentication context**
  - `contexts/AuthContext.tsx` provides `useAuth()` and an `AuthProvider` that:
    - Restores `auth_token` from `localStorage` on load.
    - Calls `/api/auth/me` to fetch the current user and role.
    - Implements `login(username, password)` via `POST /api/auth/login` then re-fetches `/api/auth/me`.
    - Provides `logout()` that clears local auth state and `localStorage`.
  - Components can check `isAuthenticated` and `user.role` to gate editing/administration UI (e.g., Graph editing vs. read-only).

- **Main graph experience**
  - `components/GraphView.tsx` is the high-level container for the graph workspace:
    - Composes:
      - `GraphCanvas` for visual graph editing/rendering.
      - Side panels (`Sidebar`, `HistoryPanel`, `SearchPanel`, `AnalyticsDashboard`) and modal dialogs (`AddObjectModal`, `AddRelationModal`, `AddObjectTypeModal`, `AddRelationTypeModal`, `FilterModal`, `SettingsModal`, `BulkChangeTypeModal`).
      - Bottom toolbar (layout selector, save layout button, filter/search/analytics toggles, etc.).
    - Uses a set of hooks to manage distinct concerns:
      - `useGraphData` – loading and mutating graph objects/relations/types and synchronizing with the backend.
      - `useLayoutManager` – applying auto-layout algorithms and saving/loading layouts via the backend.
      - `useGraphFilters` – deriving filtered `nodes`/`edges` sets based on type filters and flags.
      - `useMultiSelection` – multi-node selection and bulk actions.
      - `useHistory` – undo/redo stack, wired into graph operations for reversible actions.
      - `usePathFinding` – pathfinding requests and state (currently oriented around `/api/find-path` semantics).
      - `useBulkOperations` – client-side bulk delete and type change operations layered on top of backend endpoints.
    - Orchestrates keyboard shortcuts for bulk selection (`Ctrl+A`), delete, history toggles, and search panel toggles.

- **Graph rendering and interactions**
  - `components/GraphCanvas.tsx` wraps React Flow as the actual visualization layer:
    - Converts `GraphObject`/`GraphRelation` into `Node`/`Edge` structures used by React Flow, including styling differences for selected nodes/edges and relation type labels on edges.
    - Accepts callbacks for node/edge selection, node context menu actions, and node position changes.
    - Tracks node movement and calls `onNodesPositionChange` with debounced batches of positions, which `GraphView` feeds back into `useGraphData.updateNodesPositions` to keep layout state consistent.
    - Implements a right-click context menu on nodes (`create-relation`, `edit`, `delete`, `find-path`).
    - Contains a **fallback Dijkstra-based pathfinding client**: if the parent `onNodeAction` does not handle `find-path`, it performs a two-click path selection, then calls the backend:
      - Primary: `GET {API_BASE}/api/dijkstra-path?fromId={from}&toId={to}` (where `API_BASE` can come from `window.__API_BASE`).
      - Fallback: `GET http://localhost:5000/api/dijkstra-path?...`.
      - Highlights the returned path by setting `selectedNodesLocal`/`selectedEdgesLocal` and shows a draggable modal listing the path nodes, names, IDs, and total weight.

- **Data loading and mutation hooks**
  - `hooks/useGraphData.ts` centralizes all graph-related API calls and state:
    - On `loadInitialData`, it fetches object and relation types, objects (`/api/objects`), and relations (`/api/relations`).
    - Optionally merges stored layout coordinates (via `layoutLoader`) into the fetched objects.
    - Provides mutation operations:
      - `addObject`, `updateObject`, `deleteObject` – call the corresponding `/api/objects` endpoints and update local state while preserving existing node positions.
      - `addRelation`, `updateRelation`, `deleteRelation` – call `/api/relations` endpoints and refresh edge state.
      - `addObjectType`/`deleteObjectType`, `addRelationType`/`deleteRelationType` – manage type entities using `/api/object-types` and `/api/relation-types`.
      - `updateNodesPositions` – updates in-memory node positions in response to drag operations in `GraphCanvas`.
    - Integrates with `useHistory` by pushing undo/redo actions describing each high-level change (create/update/delete of objects/relations), including logic to recreate deleted nodes/edges when undoing.

- **Search UI**
  - `hooks/useGraphSearch.ts` is the frontend abstraction over the search API:
    - `search(query, options)` uses `POST /api/search?query=...` with a `SearchOptions` body that mirrors backend search options.
    - `quickSearch(query, limit, fuzzy)` hits `GET /api/search?q=...&limit=...&fuzzy=...`.
    - `searchObjects` and `searchRelations` call object- and relation-specific endpoints.
    - Tracks `searchResults` (objects, relations, counts, duration) and exposes helpers `getFoundObjectIds()` and `getFoundRelationIds()` for selection/highlighting.
    - Uses `react-toastify` to display success/error summaries of search results.
  - `components/SearchPanel.tsx` (not detailed here) uses `useGraphSearch` and allows GraphView to highlight and select returned nodes/relations via callbacks.

- **Pathfinding hook**
  - `hooks/usePathFinding.ts` provides a simpler `/api/find-path`-based flow for pathfinding (distinct from the Dijkstra endpoint used in the fallback in `GraphCanvas`):
    - `findPath(from, to)` calls `GET /api/find-path?sourceId=...&targetId=...`, stores the returned path, and optionally a richer `PathResult` if the API returns `nodeIds`/`edgeIds`.
    - `clearPath()` resets state.

### Data and layout flow across backend and frontend

- Graph entities are stored in Postgres via EF Core entities (`GraphObject`, `GraphRelation`, `ObjectType`, `RelationType`, property tables, `GraphLayout`).
- API endpoints expose DTOs that the frontend types in `types/graph.ts` approximate (IDs, type references, key-value properties, optional styling fields).
- Initial loads fetch both graph topology and type metadata; `useGraphData` merges previous layout coordinates to keep visual positions stable across reloads.
- Node position changes are debounced in `GraphCanvas` and sent back up through `updateNodesPositions`; the layout manager hook can then persist layouts via dedicated layout endpoints (backed by `GraphLayout` and `GraphService`), allowing per-user or per-graph saved layouts.
- Pathfinding and search form a loop between frontend UX (context menus, panels, highlighting) and backend algorithms (`DijkstraPathFinder`, fuzzy search over objects/relations), with results projected onto the React Flow visualization.
